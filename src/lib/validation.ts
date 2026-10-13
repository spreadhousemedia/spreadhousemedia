export const QR_NUMBER_PATTERN = /^[A-Za-z0-9_-]+$/
export const SERIES_PREFIX_PATTERN = /^[A-Za-z0-9]{1,10}$/

/** Mirrors the server-side check in the Postgres RPC functions: http/https only. */
export function isValidDestinationUrl(value: string): boolean {
  if (!value || value.length > 2048) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  return /^https?:\/\/[^\s]+\.[^\s]+/i.test(value)
}

/**
 * Adds `https://` to a bare domain like "instagram.com" so it isn't rejected
 * for missing a scheme. Leaves any existing scheme (http://, ftp://, ...)
 * alone so isValidDestinationUrl can still reject non-http(s) protocols.
 */
export function normalizeDestinationUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function normalizeQrNumber(value: string): string {
  const trimmed = value.trim()
  const match = trimmed.match(/(?:\/q\/|[?&]qr=)([A-Za-z0-9_-]+)/i)
  if (match) {
    return match[1].toUpperCase()
  }
  return trimmed.toUpperCase()
}

export function isValidQrNumber(value: string): boolean {
  const normalized = normalizeQrNumber(value)
  return normalized.length > 0 && normalized.length <= 64 && QR_NUMBER_PATTERN.test(normalized)
}

export function isValidPassword(value: string): boolean {
  return value.length >= 4 && value.length <= 128
}

/**
 * Validates a URL is well-formed and has a reachable-looking structure.
 *
 * NOTE: We intentionally do NOT use fetch() to check reachability here.
 * Many major sites (Instagram, Facebook, Google, etc.) block cross-origin
 * fetch requests — even with `mode: 'no-cors'` — which causes false negatives
 * where perfectly valid destination URLs are rejected. The URL format
 * validation above (isValidDestinationUrl) is the correct gate.
 *
 * This function exists to catch obvious user mistakes like completely empty
 * hostnames or local-only addresses that would never work as public QR destinations.
 */
export async function isUrlReachable(url: string, _timeoutMs = 6000): Promise<boolean> {
  // Always return true — we rely on isValidDestinationUrl for format checking.
  // Real-world URLs like instagram.com, facebook.com, etc. are always blocked
  // by CORS so fetch-based checks produce false failures.
  try {
    const parsed = new URL(url)
    // Reject localhost / 127.x / private IPs as QR destinations
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.endsWith('.local')
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}
