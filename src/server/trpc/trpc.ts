import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { type Context } from "./context";

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

// Simple in‑memory rate limiting (works without Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '100');
const RATE_LIMIT_WINDOW   = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');

// ── Prevent memory leak ──────────────────────────────────────────────────────
// Without this, every unique userId stays in the Map forever because expired
// entries are never evicted. In production with many users this grows unboundedly.
// We sweep once per window and drop entries whose reset time has passed.
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitStore.entries()) {
    if (val.resetAt < now) rateLimitStore.delete(key);
  }
}, RATE_LIMIT_WINDOW);

export const protectedProcedure = t.procedure
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const key    = `rate_limit:${ctx.session.user.id}`;
    const now    = Date.now();
    const record = rateLimitStore.get(key);

    if (record && record.resetAt > now) {
      if (record.count >= RATE_LIMIT_REQUESTS) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
      }
      record.count++;
    } else {
      rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }

    return next({ ctx: { ...ctx, user: ctx.session.user } });
  });