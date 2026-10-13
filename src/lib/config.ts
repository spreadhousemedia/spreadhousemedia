/**
 * Production-ready dynamic base URL resolver.
 * Defaults to current browser origin in production if VITE_APP_BASE_URL is not set
 * or points to localhost while deployed on a live domain.
 */
export const APP_BASE_URL = (() => {
  const envUrl = (import.meta.env.VITE_APP_BASE_URL || '').trim().replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    // If deployed on a live domain but env has localhost or is empty, use actual origin
    const isLiveOrigin = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    if (!envUrl || (isLiveOrigin && envUrl.includes('localhost'))) {
      return window.location.origin
    }
  }
  return envUrl || (typeof window !== 'undefined' ? window.location.origin : '')
})()

export function qrPublicUrl(qrNumber: string): string {
  return `${APP_BASE_URL}/q/${encodeURIComponent(qrNumber.trim())}`
}
