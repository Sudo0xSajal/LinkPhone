import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Health check endpoint for production monitoring.
 * Verifies database connectivity and returns service status.
 */
export async function GET() {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'unknown',
    services: {
      livekit: 'unknown',
      redis: 'unknown',
    },
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'connected';
  } catch (error) {
    status.status = 'unhealthy';
    status.database = 'disconnected';
  }

  // Check LiveKit configuration (optional)
  if (process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.NEXT_PUBLIC_LIVEKIT_URL) {
    status.services.livekit = 'configured';
  } else {
    status.services.livekit = 'not_configured';
  }

  // Check Redis if configured
  if (process.env.REDIS_URL) {
    try {
      const { createClient } = require('redis');
      const redisClient = createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
      await redisClient.quit();
      status.services.redis = 'connected';
    } catch {
      status.services.redis = 'disconnected';
    }
  } else {
    status.services.redis = 'not_configured';
  }

  const httpStatus = status.status === 'healthy' ? 200 : 503;
  return NextResponse.json(status, { status: httpStatus });
}