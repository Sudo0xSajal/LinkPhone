/**
 * Custom Next.js HTTP server with Socket.io integration.
 *
 * Responsibilities:
 *  - Integrates Next.js request handling with a raw HTTP server
 *  - Manages Socket.io connections from Android companion devices
 *  - Maintains a map of device IDs to Socket.io sockets for real-time communication
 *  - Authenticates internal heartbeat requests via X-Internal-Secret header
 *  - Forwards device commands (flashlight, vibrate, screenshots, etc.) from web to Android
 *  - Handles battery, location, and connection status updates from devices
 *
 * Architecture notes:
 *  - globalThis._deviceSockets is exposed early (before io.on handler) to prevent stale references
 *  - CORS origin is '*' to allow Android app from any LAN/network address
 *  - All fetch errors are handled with try/catch and logged for debugging
 *  - Graceful shutdown closes DB connections and in-flight sockets cleanly
 */
'use strict';

// ── Load .env FIRST – before any other require() reads process.env ──────────
// FIX 1 (ROOT CAUSE): dotenv was missing from package.json dependencies, so
// require('dotenv').config() always threw and was silently swallowed. The .env
// file was never loaded, so every env var was undefined when validateEnv() ran.
// dotenv is now in dependencies (npm install picks it up); the try/catch is
// removed so a missing dotenv package surfaces as a clear error rather than
// silently poisoning all downstream env reads.
require('dotenv').config();

const { createServer } = require('http');
const { parse }        = require('url');
const next             = require('next');
const { Server }       = require('socket.io');
const os               = require('os');

const dev  = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const internalSecret =
  process.env.WEBHOOK_SECRET || process.env.INTERNAL_SECRET || '';

// Helper to get the LAN IP address (first non-internal IPv4)
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// ── Validate environment before booting ─────────────────────────────────────
// FIX 2: env validation is inlined as plain JS instead of requiring env.ts.
//
// The previous approach called require('./src/lib/env') which needs ts-node to
// parse TypeScript syntax. ts-node is a devDependency – absent in production –
// so `NODE_ENV=production node server.js` crashed with a SyntaxError on the
// TypeScript annotation in env.ts before printing any useful message.
//
// Inlining the check as plain JS means both dev and production share the same
// zero-dependency startup path. env.ts still exists for use inside the Next.js
// / tRPC layer where TypeScript compilation handles it at build time.
function validateEnv() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'WEBHOOK_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
      `Copy .env.example → .env and fill in the values.`,
    );
  }

  const optional = {
    LIVEKIT_API_KEY:         'camera/mic streaming will not work',
    LIVEKIT_API_SECRET:      'camera/mic streaming will not work',
    NEXT_PUBLIC_LIVEKIT_URL: 'camera/mic streaming will not work',
  };

  for (const [key, consequence] of Object.entries(optional)) {
    if (!process.env[key]) {
      console.warn(`[env] ⚠️  ${key} is not set – ${consequence}`);
    }
  }
}

try {
  validateEnv();
} catch (err) {
  console.error('[startup] ❌ Environment validation failed:', err.message);
  process.exit(1);
}

const app    = next({ dev });
const handle = app.getRequestHandler();

// Map of deviceId → Socket.io socket – shared with tRPC procedures via global.
// Exposed BEFORE io setup so tRPC can reference the map even if the first
// connection arrives during startup.
const deviceSockets = new Map();
global._deviceSockets = deviceSockets;

// ─────────────────────────────────────────────────────────────────────────────
// Internal API helper – used by socket event handlers to update the DB
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXTAUTH_URL || `http://localhost:${port}`;

// Always resolves (never rejects) so fire-and-forget call sites inside socket
// event handlers never produce an unhandledRejection on Node 15+.
async function internalPost(path, body) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[server] POST ${path} → ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error(`[server] POST ${path} failed:`, err.message);
  }
}

async function updateDeviceStatus(deviceId, isOnline, batteryLevel) {
  const body = { deviceId, isOnline };
  if (typeof batteryLevel === 'number') body.batteryLevel = batteryLevel;
  return internalPost('/api/device/heartbeat', body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────
app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Next.js handle() expects a UrlWithParsedQuery from url.parse(), NOT a
    // WHATWG URL object. url.parse(str, true) produces .query as a plain
    // key→value object, which is exactly what the Next.js router requires.
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      // '*' allows Android app from any LAN IP or production domain
      // without having to update this file per environment.
      origin:  '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // ── Device connections (Android app) ────────────────────────────────────
  io.on('connection', (socket) => {
    const deviceId = socket.handshake.query.deviceId;

    if (!deviceId || typeof deviceId !== 'string') {
      console.warn('[socket.io] Connection without deviceId – ignored');
      socket.disconnect(true);
      return;
    }

    deviceSockets.set(deviceId, socket);
    console.log(`✅ Device "${deviceId}" connected via Socket.io`);

    updateDeviceStatus(deviceId, true);

    socket.on('command_ack', (data) => {
      console.log(`[socket.io] Ack from ${deviceId}:`, data);
    });

    socket.on('battery_update', (data) => {
      updateDeviceStatus(deviceId, true, data?.level);
    });

    socket.on('location_update', (data) => {
      const { lat, lng, accuracy } = data ?? {};
      if (typeof lat === 'number' && typeof lng === 'number') {
        console.log(`[location] ${deviceId}: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        internalPost('/api/device/location', { deviceId, lat, lng, accuracy });
      }
    });

    // await the DB write so the "device went offline" heartbeat reaches the DB
    // before the socket is fully torn down on shutdown.
    socket.on('disconnect', async (reason) => {
      deviceSockets.delete(deviceId);
      console.log(`❌ Device "${deviceId}" disconnected (${reason})`);
      await updateDeviceStatus(deviceId, false);
    });

    socket.on('error', (err) => {
      console.error(`[socket.io] Error on device "${deviceId}":`, err.message);
    });
  });

  // '0.0.0.0' accepts connections on localhost AND 192.168.x.x AND any
  // other interface – required for Android on the same WiFi.
  httpServer.listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    const localIp = getLocalIpAddress();
    console.log(`> Ready on ${BASE_URL}`);
    console.log(`> Socket.io listening on 0.0.0.0:${port}`);
    if (dev) console.log(`> LAN access: http://${localIp}:${port}`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  // Close Socket.io FIRST – drains in-flight disconnect handlers and their
  // DB writes – then close the HTTP server so the port isn't left in
  // TIME_WAIT during deploys / restarts.
  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received – shutting down gracefully…`);
    await new Promise((resolve) => io.close(resolve));
    console.log('[server] Socket.io closed');
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('[server] HTTP server closed');
    process.exit(0);
  };

  const forceExit = () =>
    setTimeout(() => { console.error('[server] Force exit'); process.exit(1); }, 10_000);

  process.on('SIGTERM', () => { forceExit(); shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { forceExit(); shutdown('SIGINT');  });
});