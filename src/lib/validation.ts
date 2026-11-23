import type { BusinessPurpose, SocialPlatform } from '../types'
import { PORTAL_BASE_PATH } from './config'

export const QR_NUMBER_PATTERN = /^[A-Za-z0-9_-]+$/
export const SERIES_PREFIX_PATTERN = /^[A-Za-z0-9]{1,10}$/
export const PUBLIC_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{2,39}$/

export const RESERVED_PUBLIC_SLUGS = new Set([
  'admin',
  'login',
  'logout',
  'update',
  'products',
  'support',
  'contact',
  'q',
  'p',
  'api',
  'auth',
  'assets',
  'static',
  'public',
  'spreadnfc',
  'tapflow',
  'help',
  'privacy',
  'terms',
  'dashboard',
  'settings',
  'profile',
  PORTAL_BASE_PATH.replace(/^\/+/, '').toLowerCase(),
])

/** Mirrors the server-side check in the Postgres RPC functions: http/https only. */
export function isValidDestinationUrl(value: string): boolean {
  if (!value || value.length > 2048) return false
  const trimmed = value.trim()
  if (/^\s*(javascript|data|file|vbscript|about|blob):/i.test(trimmed)) return false
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  return /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(trimmed)
}

/**
 * Adds `https://` to a bare domain like "instagram.com" so it isn't rejected
 * for missing a scheme. Leaves any existing scheme (http://, ftp://, javascript:, ...)
 * alone so isValidDestinationUrl can strictly reject non-http(s) protocols.
 */
export function normalizeDestinationUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function normalizeQrNumber(value: string): string {
  const trimmed = value.trim()
  const match = trimmed.match(/(?:\/q\/|\/p\/|[?&]qr=)([A-Za-z0-9_-]+)/i)
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

export function normalizePublicSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
}

export function isValidPublicSlug(value: string): boolean {
  const clean = value.trim().toLowerCase()
  if (!clean) return true // optional
  if (RESERVED_PUBLIC_SLUGS.has(clean)) return false
  return PUBLIC_SLUG_PATTERN.test(clean)
}

export interface PlatformMeta {
  id: SocialPlatform
  label: string
  defaultTitle: string
  placeholder: string
  allowedHosts?: string[]
  popular?: boolean
  brandColor: string
}

export const SOCIAL_PLATFORMS: PlatformMeta[] = [
  {
    id: 'google_reviews',
    label: 'Google Reviews',
    defaultTitle: 'Leave a Google Review',
    placeholder: 'https://g.page/r/your-business/review',
    allowedHosts: ['g.page', 'google.com', 'maps.app.goo.gl', 'goo.gl', 'search.google.com'],
    brandColor: '#FBBC05',
  },
  {
    id: 'google_maps',
    label: 'Google Maps',
    defaultTitle: 'Find Us on Google Maps',
    placeholder: 'https://maps.app.goo.gl/... or Google Maps URL',
    allowedHosts: ['maps.google.com', 'google.com', 'maps.app.goo.gl', 'goo.gl'],
    brandColor: '#34A853',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    defaultTitle: 'Instagram',
    placeholder: '@username or Instagram profile URL',
    allowedHosts: ['instagram.com', 'instagr.am'],
    popular: true,
    brandColor: '#E4405F',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    defaultTitle: 'WhatsApp',
    placeholder: 'Phone number with country code (e.g. +91 98765 43210)',
    allowedHosts: ['wa.me', 'whatsapp.com', 'api.whatsapp.com', 'chat.whatsapp.com'],
    popular: true,
    brandColor: '#25D366',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    defaultTitle: 'TikTok',
    placeholder: '@username or TikTok profile URL',
    allowedHosts: ['tiktok.com', 'vm.tiktok.com'],
    brandColor: '#000000',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    defaultTitle: 'YouTube',
    placeholder: '@handle or YouTube channel URL',
    allowedHosts: ['youtube.com', 'youtu.be', 'm.youtube.com'],
    popular: true,
    brandColor: '#FF0000',
  },
  {
    id: 'website',
    label: 'Website',
    defaultTitle: 'My Website',
    placeholder: 'https://yourwebsite.com',
    brandColor: '#3B82F6',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    defaultTitle: 'Spotify',
    placeholder: 'Spotify artist, playlist, or profile URL',
    allowedHosts: ['open.spotify.com', 'spotify.com', 'spoti.fi'],
    brandColor: '#1DB954',
  },
  {
    id: 'threads',
    label: 'Threads',
    defaultTitle: 'Threads',
    placeholder: '@username or Threads profile URL',
    allowedHosts: ['threads.net', 'threads.com'],
    brandColor: '#101010',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    defaultTitle: 'Facebook',
    placeholder: 'Username or Facebook profile URL',
    allowedHosts: ['facebook.com', 'fb.com', 'fb.me', 'm.facebook.com'],
    brandColor: '#1877F2',
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    defaultTitle: 'X (Twitter)',
    placeholder: '@handle or X profile URL',
    allowedHosts: ['x.com', 'twitter.com', 'mobile.twitter.com'],
    brandColor: '#0F1419',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    defaultTitle: 'LinkedIn',
    placeholder: 'Profile URL or LinkedIn handle',
    allowedHosts: ['linkedin.com', 'lnkd.in'],
    popular: true,
    brandColor: '#0A66C2',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    defaultTitle: 'Telegram',
    placeholder: '@username or t.me link',
    allowedHosts: ['t.me', 'telegram.me', 'telegram.org'],
    brandColor: '#26A5E4',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    defaultTitle: 'Snapchat',
    placeholder: 'Username or Snapchat add URL',
    allowedHosts: ['snapchat.com', 'snap.com'],
    brandColor: '#FFFC00',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    defaultTitle: 'Pinterest',
    placeholder: 'Username or Pinterest profile URL',
    allowedHosts: ['pinterest.com', 'pin.it'],
    brandColor: '#BD081C',
  },
  {
    id: 'github',
    label: 'GitHub',
    defaultTitle: 'GitHub',
    placeholder: 'Username or GitHub profile URL',
    allowedHosts: ['github.com'],
    brandColor: '#181717',
  },
  {
    id: 'discord',
    label: 'Discord',
    defaultTitle: 'Discord',
    placeholder: 'Invite code or discord.gg URL',
    allowedHosts: ['discord.gg', 'discord.com', 'discordapp.com'],
    brandColor: '#5865F2',
  },
  {
    id: 'custom',
    label: 'Custom Link',
    defaultTitle: 'Custom Link',
    placeholder: 'https://example.com/your-link',
    brandColor: '#6E56CF',
  },
]

export function getPlatformMeta(platform: SocialPlatform): PlatformMeta {
  return SOCIAL_PLATFORMS.find((p) => p.id === platform) ?? SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1]
}

const UNSAFE_SCHEME_PREFIX = /^\s*(javascript|data|file|vbscript|about|blob|ftp|mailto|tel|sms):/i

/**
 * Normalizes platform-specific user inputs (handles, usernames, phone numbers, bare domains, or full URLs)
 * into canonical HTTPS URLs while preserving rejection of unsafe schemes and wrong domains.
 */
export function normalizePlatformInput(platform: SocialPlatform, rawInput: string): string {
  const trimmed = rawInput.trim()
  if (!trimmed) return ''

  // Never rewrite explicit schemes — let validator reject unsafe protocols
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed
  }
  if (UNSAFE_SCHEME_PREFIX.test(trimmed)) {
    return trimmed
  }

  // WhatsApp: phone number normalization (e.g. "+91 98765 43210" -> "https://wa.me/919876543210")
  if (platform === 'whatsapp') {
    if (/^[+\d\s().-]{7,24}$/.test(trimmed)) {
      const digits = trimmed.replace(/\D/g, '').replace(/^00/, '')
      if (digits.length >= 7 && digits.length <= 15) {
        return `https://wa.me/${digits}`
      }
    }
    return normalizeDestinationUrl(trimmed)
  }

  // If input already contains a domain-like host (e.g. "instagram.com/user" or "example.com"), normalize scheme only
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) {
    return normalizeDestinationUrl(trimmed)
  }

  // Username / handle construction for social platforms
  const cleanHandle = trimmed.replace(/^@+/, '').replace(/^\/+/, '').trim()
  if (!cleanHandle || /\s/.test(cleanHandle)) {
    return normalizeDestinationUrl(trimmed)
  }

  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${cleanHandle}`
    case 'tiktok':
      return `https://tiktok.com/@${cleanHandle}`
    case 'youtube':
      return `https://youtube.com/@${cleanHandle}`
    case 'x':
      return `https://x.com/${cleanHandle}`
    case 'threads':
      return `https://threads.net/@${cleanHandle}`
    case 'telegram':
      return `https://t.me/${cleanHandle}`
    case 'snapchat':
      return `https://snapchat.com/add/${cleanHandle}`
    case 'github':
      return `https://github.com/${cleanHandle}`
    case 'pinterest':
      return `https://pinterest.com/${cleanHandle}`
    case 'facebook':
      return `https://facebook.com/${cleanHandle}`
    case 'linkedin':
      return cleanHandle.startsWith('in/') || cleanHandle.startsWith('company/')
        ? `https://linkedin.com/${cleanHandle}`
        : `https://linkedin.com/in/${cleanHandle}`
    case 'discord':
      return `https://discord.gg/${cleanHandle}`
    default:
      return normalizeDestinationUrl(trimmed)
  }
}

export function validatePlatformLinkUrl(
  platform: SocialPlatform,
  rawUrl: string,
): { ok: true; normalizedUrl: string } | { ok: false; error: string } {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return { ok: false, error: 'Please enter a handle, phone number, or URL.' }
  }

  if (UNSAFE_SCHEME_PREFIX.test(trimmed)) {
    return { ok: false, error: 'Only safe http:// or https:// web destinations are allowed.' }
  }

  const normalized = normalizePlatformInput(platform, trimmed)
  if (!isValidDestinationUrl(normalized)) {
    if (platform === 'whatsapp') {
      return {
        ok: false,
        error: 'Enter a phone number with country code (e.g. +91 98765 43210) or a valid wa.me URL.',
      }
    }
    return { ok: false, error: 'Please enter a valid username or https:// URL.' }
  }

  try {
    const parsed = new URL(normalized)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    if (isPrivateOrLocalHost(host)) {
      return { ok: false, error: 'Local or private network URLs cannot be used as public links.' }
    }

    const meta = getPlatformMeta(platform)
    if (meta.allowedHosts && meta.allowedHosts.length > 0) {
      const matches = meta.allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
      if (!matches) {
        return {
          ok: false,
          error: `This doesn't look like a ${meta.label} link (expected ${meta.allowedHosts[0]}). Use "Website" or "Other Links" for other domains.`,
        }
      }
    }
    return { ok: true, normalizedUrl: normalized }
  } catch {
    return { ok: false, error: 'Please enter a valid URL.' }
  }
}

export const BUSINESS_PURPOSES: Array<{
  id: BusinessPurpose
  label: string
  description: string
  placeholder: string
}> = [
  {
    id: 'google_reviews',
    label: 'Google Reviews',
    description: 'Send customers straight to your Google review prompt.',
    placeholder: 'https://g.page/r/your-business/review',
  },
  {
    id: 'website',
    label: 'Business Website',
    description: 'Open your main website, digital menu, or storefront.',
    placeholder: 'https://yourbusiness.com',
  },
  {
    id: 'payment',
    label: 'Payment Link',
    description: 'Route customers directly to your checkout or payment page.',
    placeholder: 'https://rzp.io/l/yourstore',
  },
  {
    id: 'feedback',
    label: 'Feedback Form',
    description: 'Collect customer ratings via Google Forms, Typeform, etc.',
    placeholder: 'https://forms.gle/yourform',
  },
  {
    id: 'product',
    label: 'Product Page',
    description: 'Highlight a featured product, brochure, or catalog.',
    placeholder: 'https://yourstore.com/product',
  },
  {
    id: 'custom',
    label: 'Custom URL',
    description: 'Direct redirection to any valid HTTPS destination.',
    placeholder: 'https://example.com',
  },
]

export function getBusinessPurposeLabel(purpose: BusinessPurpose | null | undefined): string {
  return BUSINESS_PURPOSES.find((p) => p.id === purpose)?.label ?? 'Custom URL'
}

/**
 * Compresses an uploaded image file client-side into a small square-cropped JPEG/WebP data URL
 * so profile photos load fast and persist cleanly without requiring extra storage setup.
 */
export async function compressProfileImage(file: File): Promise<string> {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please upload a PNG, JPG, or WebP image.')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image file must be under 8 MB.')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the selected image.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid image file.'))
      img.onload = () => {
        const targetSize = 280
        const canvas = document.createElement('canvas')
        canvas.width = targetSize
        canvas.height = targetSize
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'))
          return
        }

        // Center-crop square
        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        if (dataUrl.length > 340_000) {
          resolve(canvas.toDataURL('image/jpeg', 0.65))
        } else {
          resolve(dataUrl)
        }
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Compresses a business brand logo preserving full aspect ratio (no square crop)
 * and alpha transparency for PNG/WebP files, strictly under Postgres's 350k char limit.
 */
export async function compressBusinessLogo(file: File): Promise<string> {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please upload a PNG, JPG, or WebP logo.')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Logo file must be under 8 MB.')
  }

  const MAX_W = 420
  const MAX_H = 240
  const MAX_LEN = 320_000
  const isTransparentInput = file.type === 'image/png' || file.type === 'image/webp'

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the selected logo.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid logo image file.'))
      img.onload = () => {
        const natW = img.naturalWidth || img.width || MAX_W
        const natH = img.naturalHeight || img.height || MAX_H
        const scale = Math.min(1, MAX_W / natW, MAX_H / natH)
        const targetW = Math.max(1, Math.round(natW * scale))
        const targetH = Math.max(1, Math.round(natH * scale))

        const canvas = document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'))
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        if (isTransparentInput) {
          ctx.clearRect(0, 0, targetW, targetH)
          ctx.drawImage(img, 0, 0, targetW, targetH)

          const webpHi = canvas.toDataURL('image/webp', 0.9)
          if (webpHi.startsWith('data:image/webp;base64,') && webpHi.length <= MAX_LEN) {
            resolve(webpHi)
            return
          }

          const pngUrl = canvas.toDataURL('image/png')
          if (pngUrl.startsWith('data:image/png;base64,') && pngUrl.length <= MAX_LEN) {
            resolve(pngUrl)
            return
          }

          const webpLo = canvas.toDataURL('image/webp', 0.75)
          if (webpLo.startsWith('data:image/webp;base64,') && webpLo.length <= MAX_LEN) {
            resolve(webpLo)
            return
          }
        }

        // Non-transparent input or final fallback for oversized images: paint crisp white background before JPEG
        ctx.clearRect(0, 0, targetW, targetH)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, targetW, targetH)
        ctx.drawImage(img, 0, 0, targetW, targetH)

        const jpegHi = canvas.toDataURL('image/jpeg', 0.86)
        if (jpegHi.length <= MAX_LEN) {
          resolve(jpegHi)
          return
        }
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export interface BusinessCategoryOption {
  id: string
  label: string
  examples: string
}

export const BUSINESS_CATEGORY_OPTIONS: BusinessCategoryOption[] = [
  { id: 'Food & Beverage', label: 'Food & Beverage', examples: 'Restaurant, Cafe, Bakery' },
  { id: 'Retail', label: 'Retail', examples: 'Clothing, Electronics, Grocery' },
  { id: 'Real Estate', label: 'Real Estate', examples: 'Property Dealer, Builder, Consultant' },
  { id: 'Professional Services', label: 'Professional Services', examples: 'Agency, Consultant, Freelancer' },
  { id: 'Beauty & Wellness', label: 'Beauty & Wellness', examples: 'Salon, Spa, Fitness' },
  { id: 'Hospitality', label: 'Hospitality', examples: 'Hotel, Resort, Travel' },
  { id: 'Education', label: 'Education', examples: 'Institute, Coaching, School' },
  { id: 'Healthcare', label: 'Healthcare', examples: 'Clinic, Dental, Pharmacy' },
  { id: 'Automotive', label: 'Automotive', examples: 'Car Dealer, Service Centre' },
  { id: 'Other', label: 'Other', examples: 'Any other business' },
]

export const BUSINESS_CATEGORIES: string[] = BUSINESS_CATEGORY_OPTIONS.map((c) => c.label)

export interface BusinessLinkTemplate {
  id: string
  label: string
  purpose: string
  platform: SocialPlatform
  defaultTitle: string
  icon: string | null
  placeholder: string
}

export const BUSINESS_LINK_TEMPLATES: BusinessLinkTemplate[] = [
  {
    id: 'google_reviews',
    label: 'Google Reviews',
    purpose: 'Collect customer reviews',
    platform: 'google_reviews',
    defaultTitle: 'Leave a Google Review',
    icon: null,
    placeholder: 'https://g.page/r/your-business/review',
  },
  {
    id: 'google_maps',
    label: 'Google Maps',
    purpose: 'Show business location',
    platform: 'google_maps',
    defaultTitle: 'Find Us on Google Maps',
    icon: null,
    placeholder: 'https://maps.app.goo.gl/...',
  },
  {
    id: 'website',
    label: 'Website',
    purpose: 'Official website',
    platform: 'website',
    defaultTitle: 'Visit Our Website',
    icon: null,
    placeholder: 'https://yourbusiness.com',
  },
  {
    id: 'menu',
    label: 'Menu',
    purpose: 'Restaurant / Cafe menu',
    platform: 'custom',
    defaultTitle: 'View Digital Menu',
    icon: 'file-text',
    placeholder: 'https://yourcafe.com/menu',
  },
  {
    id: 'book_appointment',
    label: 'Book Appointment',
    purpose: 'Appointment booking',
    platform: 'custom',
    defaultTitle: 'Book an Appointment',
    icon: 'calendar',
    placeholder: 'https://cal.com/your-business',
  },
  {
    id: 'online_store',
    label: 'Online Store',
    purpose: 'E-commerce',
    platform: 'custom',
    defaultTitle: 'Shop Online Store',
    icon: 'shopping-bag',
    placeholder: 'https://shop.yourbusiness.com',
  },
  {
    id: 'payment',
    label: 'Payment',
    purpose: 'Payment gateway',
    platform: 'custom',
    defaultTitle: 'Pay Online',
    icon: 'credit-card',
    placeholder: 'https://rzp.io/l/yourstore',
  },
  {
    id: 'contact_us',
    label: 'Contact Us',
    purpose: 'Contact page',
    platform: 'custom',
    defaultTitle: 'Contact Us',
    icon: 'phone',
    placeholder: 'https://yourbusiness.com/contact',
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    purpose: 'Product catalogue',
    platform: 'custom',
    defaultTitle: 'View Product Catalogue',
    icon: 'book-open',
    placeholder: 'https://yourbusiness.com/catalogue',
  },
  {
    id: 'booking',
    label: 'Booking',
    purpose: 'Reservation page',
    platform: 'custom',
    defaultTitle: 'Reserve a Table / Slot',
    icon: 'calendar',
    placeholder: 'https://yourbusiness.com/book',
  },
]

export function isValidContactEmail(value: string): boolean {
  const clean = value.trim()
  if (!clean) return true
  return clean.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)
}

export function isValidContactPhone(value: string): boolean {
  const clean = value.trim()
  if (!clean) return true
  return /^[+\d\s().-]{6,30}$/.test(clean)
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    host.startsWith('127.') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  )
}

/**
 * Validates a URL is well-formed and has a reachable-looking structure.
 */
export async function isUrlReachable(url: string, _timeoutMs = 6000): Promise<boolean> {
  try {
    const parsed = new URL(url)
    if (isPrivateOrLocalHost(parsed.hostname)) {
      return false
    }
    return true
  } catch {
    return false
  }
}
