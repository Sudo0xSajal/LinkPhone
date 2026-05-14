import { AccessToken } from "livekit-server-sdk";
import { logger } from './logger';

const tokenCache = new Map<string, { token: string; expires: number }>();

export async function createLiveKitToken(roomName: string, participantIdentity: string) {
  const key = `${roomName}:${participantIdentity}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expires > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    logger.warn('LiveKit credentials missing – returning dummy token');
    return 'missing-livekit-credentials';
  }
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    ttl: "6h",
  });
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
  const token = await at.toJwt();
  tokenCache.set(key, { token, expires: Date.now() + 6 * 60 * 60 * 1000 });
  return token;
}
