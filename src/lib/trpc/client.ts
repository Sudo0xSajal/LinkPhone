/**
 * tRPC v11 client setup.
 *
 * ROOT-CAUSE FIX: In tRPC v11 the `transformer` option was REMOVED from the
 * top-level `createClient` / `trpc.createClient()` call and must be placed
 * inside every HTTP link that will be used.  Leaving it at the top level
 * silently drops the transformer on the client, so superjson-encoded server
 * responses cannot be decoded → "Unable to transform response from server".
 */
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "@/server/trpc/router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl(): string {
  // Browser – always use a relative path so CORS is never an issue
  if (typeof window !== "undefined") return "";
  // SSR inside Next.js server process
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const getTrpcClient = () =>
  trpc.createClient({
    links: [
      // Log tRPC calls in development for easier debugging
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        // ✅ FIX: transformer MUST live inside the link in tRPC v11
        transformer: superjson,
        headers() {
          return {
            "Content-Type": "application/json",
          };
        },
      }),
    ],
  });