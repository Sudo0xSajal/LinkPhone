import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simple in-memory rate limiting middleware.
 * For production with multiple server instances, replace with Redis-based rate limiting.
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function rateLimit(
  request: NextRequest,
  limit: number = 10,
  windowMs: number = 60 * 1000
): NextResponse | null {
  const ip = request.ip ?? 'anonymous';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (record) {
    if (now - record.lastReset > windowMs) {
      // Reset window
      rateLimitMap.set(ip, { count: 1, lastReset: now });
      return null;
    }
    if (record.count >= limit) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
    record.count++;
    rateLimitMap.set(ip, record);
  } else {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
  }
  return null;
}

// Optional: Clean up old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.lastReset > 60 * 60 * 1000) {
      // Remove entries older than 1 hour
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 60 * 1000);