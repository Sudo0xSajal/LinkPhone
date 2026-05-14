import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const startedAt = Date.now();

export async function GET() {
  let dbOk = false;
  let dbLatencyMs = 0;

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch { /* dbOk stays false */ }

  // Connected Android devices (in-process counter – resets on restart)
  const connectedDevices =
    typeof global._deviceSockets !== 'undefined'
      ? global._deviceSockets.size
      : 0;

  const healthy = dbOk;

  return NextResponse.json(
    {
      status:           healthy ? 'ok' : 'degraded',
      version:          process.env.npm_package_version ?? '1.0.0',
      environment:      process.env.NODE_ENV ?? 'development',
      uptimeSeconds:    Math.floor((Date.now() - startedAt) / 1000),
      db:               { ok: dbOk, latencyMs: dbLatencyMs },
      connectedDevices,
      timestamp:        new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}