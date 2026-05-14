/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@auth/prisma-adapter"],

  // Next 14+: use `remotePatterns` instead of the deprecated `domains` key
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        // QR code generator used in the pairing flow
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/**",
      },
    ],
  },

  async headers() {
    const allowedOrigin =
      process.env.NEXTAUTH_URL || "http://localhost:3000";
    const isProd = process.env.NODE_ENV === "production";

    return [
      // ── Security headers on every page ──────────────────────────────────
      {
        source: "/(.*)",
        headers: [
          // Prevent this site from being embedded in iframes (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Stop browsers guessing content types (MIME-sniffing attacks)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Only send referrer to same origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features not needed by this app
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // Force HTTPS in production (HSTS)
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },

      // ── General API CORS ─────────────────────────────────────────────────
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-internal-secret" },
        ],
      },

      // ── Android app endpoints – open to any origin ───────────────────────
      {
        source: "/api/android/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;