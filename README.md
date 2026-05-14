# LinkPhone

> Remote monitor and control your Android phone from any browser.

LinkPhone is a full-stack web application that lets you pair your Android device and control it in real time from a modern web dashboard — no third-party cloud required.

---

## Features

| Category | Capability |
|---|---|
| **Device pairing** | QR-code / pairing-code flow; 15-minute expiry; instant confirmation |
| **Real-time status** | Online/offline indicator, battery level, last-seen timestamp |
| **Live camera** | Stream the device camera directly in the browser via LiveKit WebRTC |
| **Remote microphone** | Listen to the device microphone in real time via LiveKit |
| **Quick controls** | Toggle flashlight, adjust volume, trigger vibration, capture screenshot — one click |
| **File browser** | Browse and download files from the paired device |
| **Call log** | View recent call history from the device |
| **Activity timeline** | Audit log of every command and event per device |
| **Location tracking** | Real-time GPS coordinates pushed over Socket.io |
| **Automation rules** | Create trigger-based rules to automate device actions |
| **Shared access** | Grant guest users time-limited, permission-scoped access to a device |
| **Notifications** | In-app notification centre for device events |
| **Authentication** | Google OAuth via NextAuth.js; all routes server-side protected |
| **Security headers** | HSTS, X-Frame-Options, CSP permissions policy, MIME-sniff protection |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, Radix UI, Framer Motion |
| API layer | [tRPC v11](https://trpc.io/) + TanStack Query |
| Real-time | [Socket.io v4](https://socket.io/) (custom Node.js HTTP server) |
| Streaming | [LiveKit](https://livekit.io/) (WebRTC camera & mic) |
| Database | PostgreSQL via [Prisma ORM](https://www.prisma.io/) |
| Auth | [NextAuth.js v4](https://next-auth.js.org/) with Prisma adapter |
| State | Zustand |
| Forms | React Hook Form + Zod |

---

## Prerequisites

- **Node.js ≥ 18**
- **PostgreSQL** database (local or hosted)
- **Google OAuth** credentials ([console.cloud.google.com](https://console.cloud.google.com))
- *(Optional)* **LiveKit** server/cloud account for camera & mic streaming

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Sudo0xSajal/LinkPhone.git
cd LinkPhone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in every value:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random secret for session signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ | Public URL of this server (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `WEBHOOK_SECRET` | ✅ | Shared secret for internal server-to-server requests |
| `LIVEKIT_API_KEY` | ⚠️ | LiveKit API key — camera/mic streaming will not work without this |
| `LIVEKIT_API_SECRET` | ⚠️ | LiveKit API secret |
| `NEXT_PUBLIC_LIVEKIT_URL` | ⚠️ | LiveKit server WebSocket URL |

### 4. Set up the database

```bash
# Push the Prisma schema to your database
npm run db:push

# (Optional) Open Prisma Studio to inspect data
npm run db:studio
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> The server also prints your **LAN IP** (`http://192.168.x.x:3000`) so your Android companion app can reach it over Wi-Fi.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server (Next.js + Socket.io) |
| `npm run build` | Build the Next.js application for production |
| `npm start` | Start production server |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run health` | Health-check the running server |

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma        # Database schema (User, Device, ActivityLog, …)
│   └── seed.ts              # Optional seed data
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login page
│   │   ├── (dashboard)/     # Protected dashboard, device detail, activity, settings
│   │   └── api/             # REST endpoints (auth, device heartbeat, location, LiveKit token, …)
│   ├── components/
│   │   ├── dashboard/       # DeviceCard, QuickControls, ActivityTimeline, CallLog, …
│   │   ├── device/          # LiveCamera, RemoteMic, FileBrowser
│   │   └── ui/              # Shared Radix UI primitives
│   ├── lib/                 # tRPC router, Prisma client, auth config, helpers
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand stores
│   └── types/               # Shared TypeScript types
├── server.js                # Custom Node.js HTTP server with Socket.io
├── middleware.ts             # NextAuth.js route protection middleware
└── next.config.js           # Next.js config (security headers, image domains, …)
```

---

## Architecture Overview

```
Browser (Next.js)
      │  tRPC / REST (HTTPS)
      ▼
Custom Node.js HTTP Server  ◄──── Socket.io (WebSocket)  ◄──── Android companion app
      │                                                             │
      │  Prisma ORM                                      battery / location / ack events
      ▼
   PostgreSQL
      │
   NextAuth.js (Google OAuth)
```

- The **Next.js app** is served by a bare Node.js HTTP server (`server.js`) instead of the default Next.js server so that **Socket.io** can share the same port.
- The Android companion app connects via Socket.io (identified by `deviceId`) and receives commands (flashlight, screenshot, etc.) forwarded from the web UI.
- LiveKit handles all **WebRTC** signalling and media relay so camera/microphone streams never touch the Node server directly.

---

## Android Companion App

Pair your Android device by:

1. Signing in to the web dashboard.
2. Clicking **Add Device** and scanning the generated QR code with the LinkPhone Android app.
3. Entering a friendly device name and confirming — the device appears on your dashboard instantly.

---

## Deployment

1. Provision a PostgreSQL database and set `DATABASE_URL`.
2. Set all required environment variables on your host.
3. Build and start:

```bash
npm run build
npm start
```

The server listens on `0.0.0.0:3000` (or `PORT` env var) and accepts connections from both browsers and Android devices on the same network.

---

## Security

- All dashboard routes (`/dashboard`, `/activity`, `/notifications`, `/settings`) are protected server-side by NextAuth.js middleware — unauthenticated requests are redirected before any page renders.
- Internal server-to-server requests are authenticated with `X-Internal-Secret` header.
- Security response headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are applied globally via `next.config.js`.

---

## License

This project is open source. See [LICENSE](LICENSE) for details.
