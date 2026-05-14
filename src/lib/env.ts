/**
 * Environment variable validation for the Next.js / tRPC layer.
 *
 * NOTE: server.js no longer requires this file directly. The startup
 * validation in server.js is inlined as plain JS so it works in both
 * dev (without ts-node) and production (without TypeScript compilation
 * of this specific file). Keep this file for use within Next.js API
 * routes or any TypeScript context that needs typed env access.
 */
export function validateEnv() {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "WEBHOOK_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n` +
        `Copy .env.example → .env and fill in the values.`,
    );
  }

  const optional = {
    LIVEKIT_API_KEY:         "camera/mic streaming will not work",
    LIVEKIT_API_SECRET:      "camera/mic streaming will not work",
    NEXT_PUBLIC_LIVEKIT_URL: "camera/mic streaming will not work",
  };

  for (const [key, consequence] of Object.entries(optional)) {
    if (!process.env[key]) {
      console.warn(`[env] ⚠️  ${key} is not set – ${consequence}`);
    }
  }
}