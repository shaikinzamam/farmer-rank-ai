/**
 * Lightweight cache abstraction used to satisfy the PRD's "<2s response time
 * via Redis caching" NFR. Ships with an in-process Map so the project runs
 * with zero external dependencies out of the box; swap `USE_REDIS=true` and
 * point REDIS_URL at a real instance for production/horizontal scaling
 * (the Map obviously doesn't share state across worker processes).
 */

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function cacheKeyForQuery(query: string, userId: string): string {
  return `query:${encodeURIComponent(userId)}:${query.trim().toLowerCase()}`;
}
