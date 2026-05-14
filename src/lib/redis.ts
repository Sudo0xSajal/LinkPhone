// In‑memory store – no external Redis required
const memoryStore = new Map<string, string>();
const memoryTTL = new Map<string, number>();

export async function getRedisClient() { return null; }

export async function setex(key: string, ttl: number, value: string) {
  memoryStore.set(key, value);
  memoryTTL.set(key, Date.now() + ttl * 1000);
  // clean up expired keys (optional, but simple)
  setTimeout(() => {
    if (memoryTTL.get(key) && memoryTTL.get(key)! < Date.now()) {
      memoryStore.delete(key);
      memoryTTL.delete(key);
    }
  }, ttl * 1000);
}

export async function get(key: string): Promise<string | null> {
  const expires = memoryTTL.get(key);
  if (expires && expires < Date.now()) {
    memoryStore.delete(key);
    memoryTTL.delete(key);
    return null;
  }
  return memoryStore.get(key) || null;
}

export async function del(key: string) {
  memoryStore.delete(key);
  memoryTTL.delete(key);
}
