/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@auth/prisma-adapter"],

  // Image optimization – allow external domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/**",
      },
    ],
  },

  async headers() {
    const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const isProd = process.env.NODE_ENV === "production";

    return [
      // ── Security headers on every page ──────────────────────────────────
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
        ],
      },

      // ── General API CORS (restricted to allowed origin) ─────────────────
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-internal-secret" },
        ],
      },

      // ── Android app endpoints – restrict to configured origin ───────────
      {
        source: "/api/android/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.ANDROID_APP_ORIGIN || "null" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_LIVEKIT_URL: process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL,
  },
};

module.exports = nextConfig;