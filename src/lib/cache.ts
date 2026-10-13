/**
 * High-performance in-memory cache store with Time-To-Live (TTL).
 * Enables instant 0ms tab switching and Stale-While-Revalidate patterns.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const cacheStore = new Map<string, CacheEntry<unknown>>()

/**
 * Retrieve cached data if it exists and hasn't expired.
 */
export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > entry.ttl) {
    cacheStore.delete(key)
    return null
  }
  return entry.data as T
}

/**
 * Store data with a custom TTL (default 60 seconds).
 */
export function setCached<T>(key: string, data: T, ttlMs = 60_000): void {
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  })
}

/**
 * Remove any cached keys matching a given prefix.
 */
export function clearCachePrefix(prefix: string): void {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key)
    }
  }
}

/**
 * Invalidate all QR records and batch caches when mutations occur.
 */
export function invalidateAdminQrCache(): void {
  clearCachePrefix('qr_')
  clearCachePrefix('batches_')
}
