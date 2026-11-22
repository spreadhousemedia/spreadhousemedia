/**
 * Production-ready dynamic base URL resolver.
 * Defaults to current browser origin in production if VITE_APP_BASE_URL is not set
 * or points to localhost while deployed on a live domain.
 */
function readViteEnv(key: string): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env
    return (env?.[key] || '').trim()
  } catch {
    return ''
  }
}

export const APP_BASE_URL = (() => {
  const envUrl = readViteEnv('VITE_APP_BASE_URL').replace(/\/$/, '')
  if (typeof window !== 'undefined') {
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

export function profilePublicUrl(identifier: string): string {
  return `${APP_BASE_URL}/p/${encodeURIComponent(identifier.trim())}`
}

function normalizePortalBase(raw: string | undefined): string {
  const clean = (raw || '').trim().replace(/^\/+|\/+$/g, '')
  if (!clean) return '/s-vault-9x4m'
  return `/${clean}`
}

/** Private management console path (configurable via VITE_PORTAL_PATH). */
export const PORTAL_BASE_PATH = normalizePortalBase(readViteEnv('VITE_PORTAL_PATH'))
export const PORTAL_AUTH_PATH = `${PORTAL_BASE_PATH}/auth`

export function portalRoute(subpath = ''): string {
  const cleanSub = subpath.replace(/^\/+/, '')
  return cleanSub ? `${PORTAL_BASE_PATH}/${cleanSub}` : PORTAL_BASE_PATH
}
