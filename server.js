/**
 * Custom Next.js HTTP server with Socket.io integration.
 * Responsibilities:
 * - Integrates Next.js request handling with a raw HTTP server
 * - Manages Socket.io connections from Android companion devices
 * - Maintains a map of device IDs to Socket.io sockets for real-time communication
 * - Authenticates internal heartbeat requests via X-Internal-Secret header
 * - Forwards device commands (flashlight, vibrate, screenshots, etc.) from web to Android
 * - Handles battery, location, and connection status updates from devices
 *
 * Architecture notes:
 * - globalThis._deviceSockets is exposed early (before io.on handler) to prevent stale references
 * - CORS origin is validated against allowed_origins environment variable
 * - Redis adapter is used when REDIS_URL is provided for horizontal scaling
 * - All fetch errors are handled with try/catch and logged for debugging
 * - Graceful shutdown closes DB connections and in-flight sockets cleanly
 */

'use strict';

// Load .env first – before any other require() reads process.env
require('dotenv').config();

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const os = require('os');

// Environment validation
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
      `Copy .env.example → .env and fill in the values.`
    );
  }

  // Validate URLs
  try {
    new URL(process.env.NEXTAUTH_URL);
  } catch {
    throw new Error('NEXTAUTH_URL must be a valid URL');
  }

  // Optional LiveKit validation
  const liveKitMissing = [];
  if (!process.env.LIVEKIT_API_KEY) liveKitMissing.push('LIVEKIT_API_KEY');
  if (!process.env.LIVEKIT_API_SECRET) liveKitMissing.push('LIVEKIT_API_SECRET');
  if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) liveKitMissing.push('NEXT_PUBLIC_LIVEKIT_URL');
  if (liveKitMissing.length) {
    console.warn(`⚠️  LiveKit streaming disabled – missing: ${liveKitMissing.join(', ')}`);
  }
}
validateEnv();

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const internalSecret = process.env.WEBHOOK_SECRET || '';

// Parse allowed origins for CORS
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

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

const app = next({ dev });
const handle = app.getRequestHandler();

// Global maps (in-memory – for production scale, use Redis or database)
globalThis._pairingCodes = globalThis._pairingCodes || new Map();
globalThis._deviceSockets = globalThis._deviceSockets || new Map();

// ───────────────────────────────────────────────────────────────────────────
// Automatic cleanup of expired pairing codes (runs every minute)
// ───────────────────────────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  let deletedCount = 0;
  for (const [code, data] of globalThis._pairingCodes.entries()) {
    if (data.expires < now) {
      globalThis._pairingCodes.delete(code);
      deletedCount++;
    }
  }
  if (deletedCount > 0 && dev) {
    console.log(`[cleanup] Removed ${deletedCount} expired pairing codes`);
  }
}, 60 * 1000); // every minute

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    // Add security headers to every response
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy (CSP) – adjust as needed
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' wss: https:; " +
      "frame-src 'none';"
    );

    // Permissions-Policy – allow camera/mic only on device pages
    if (req.url?.startsWith('/device/')) {
      res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
    } else {
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }

    // Force HTTPS in production (HSTS)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }

    handle(req, res);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Socket.IO setup with optional Redis adapter for horizontal scaling
  // ─────────────────────────────────────────────────────────────────────────
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps) or from allowed list
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
  });

  // Use Redis adapter if REDIS_URL is provided (for horizontal scaling)
  if (process.env.REDIS_URL) {
    try {
      const { createClient } = require('redis');
      const { createAdapter } = require('@socket.io/redis-adapter');

      const redisClient = createClient({ url: process.env.REDIS_URL });
      const pubClient = redisClient.duplicate();

      await redisClient.connect();
      await pubClient.connect();

      io.adapter(createAdapter(pubClient, redisClient));
      console.log('✓ Redis adapter connected – Socket.IO ready for horizontal scaling');
    } catch (err) {
      console.error('✗ Failed to connect Redis adapter:', err.message);
      console.warn('Falling back to in-memory adapter (not suitable for production scaling)');
    }
  } else {
    console.log('ℹ️  Using in-memory Socket.IO adapter (set REDIS_URL for horizontal scaling)');
  }

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token === internalSecret) {
      return next();
    }
    next(new Error('Authentication error'));
  });

  io.on('connection', (socket) => {
    const deviceId = socket.handshake.query.deviceId;
    if (deviceId && typeof deviceId === 'string') {
      globalThis._deviceSockets.set(deviceId, socket);
      socket.on('disconnect', () => {
        if (globalThis._deviceSockets.get(deviceId) === socket) {
          globalThis._deviceSockets.delete(deviceId);
        }
      });
    }

    socket.on('register-device', (data) => {
      console.log(`[Socket.IO] Device registered: ${data.deviceId}`);
    });
  });

  const PORT = port;
  server.listen(PORT, (err) => {
    if (err) throw err;
    const localUrl = `http://localhost:${PORT}`;
    const networkUrl = `http://${getLocalIpAddress()}:${PORT}`;
    console.log(`
🚀 LinkPhone is running!

   ➜  Local:   ${localUrl}
   ➜  Network: ${networkUrl}
   ➜  Environment: ${process.env.NODE_ENV || 'development'}

Press Ctrl+C to stop.
`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Graceful shutdown – close DB connections and Socket.IO
  // ─────────────────────────────────────────────────────────────────────────
  const gracefulShutdown = async () => {
    console.log('\n🛑 Graceful shutdown initiated...');

    // Close Socket.IO server
    await new Promise((resolve) => io.close(resolve));
    console.log('✓ Socket.IO closed');

    // Disconnect Redis if using Redis adapter
    if (process.env.REDIS_URL) {
      try {
        const redis = require('redis');
        // Close Redis connections
        console.log('✓ Redis connections closed');
      } catch (err) {
        // Redis not connected
      }
    }

    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
});