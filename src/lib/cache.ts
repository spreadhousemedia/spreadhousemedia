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

export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > entry.ttl) {
    cacheStore.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T, ttlMs = 60_000): void {
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  })
}

export function clearCachePrefix(prefix: string): void {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key)
    }
  }
}

export function invalidateAdminQrCache(): void {
  clearCachePrefix('qr_')
  clearCachePrefix('batches_')
}

/**
 * Invalidate cached redirect & public profile data for a specific QR number or all.
 */
export function invalidateQrRedirectCache(qrNumber?: string): void {
  if (qrNumber) {
    const norm = qrNumber.toUpperCase().trim()
    cacheStore.delete(`redirect_${norm}`)
    cacheStore.delete(`profile_${norm.toLowerCase()}`)
    try {
      sessionStorage.removeItem(`qr_dest_${norm}`)
    } catch {
      // ignore in environments without sessionStorage
    }
  } else {
    clearCachePrefix('redirect_')
    clearCachePrefix('profile_')
  }
  clearCachePrefix('qr_')
}

export function invalidateProfileCache(identifier?: string): void {
  if (identifier) {
    cacheStore.delete(`profile_${identifier.trim().toLowerCase()}`)
  } else {
    clearCachePrefix('profile_')
  }
}
