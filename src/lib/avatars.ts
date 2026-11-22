export interface CuratedAvatar {
  id: string
  label: string
  src: string
}

export const CURATED_AVATARS: CuratedAvatar[] = [
  { id: 'avatar-01', label: 'Studio Classic', src: '/avatars/avatar-01.webp' },
  { id: 'avatar-02', label: 'Minimal Glasses', src: '/avatars/avatar-02.webp' },
  { id: 'avatar-03', label: 'Warm Natural', src: '/avatars/avatar-03.webp' },
  { id: 'avatar-04', label: 'Urban Hood', src: '/avatars/avatar-04.webp' },
  { id: 'avatar-05', label: 'Sage Casual', src: '/avatars/avatar-05.webp' },
  { id: 'avatar-06', label: 'Sharp Collar', src: '/avatars/avatar-06.webp' },
  { id: 'avatar-07', label: 'Editorial Frames', src: '/avatars/avatar-07.webp' },
  { id: 'avatar-08', label: 'Terracotta Knit', src: '/avatars/avatar-08.webp' },
  { id: 'avatar-09', label: 'Monochrome Studio', src: '/avatars/avatar-09.webp' },
  { id: 'avatar-10', label: 'Warm Ribbed', src: '/avatars/avatar-10.webp' },
  { id: 'avatar-11', label: 'Beige Tailored', src: '/avatars/avatar-11.webp' },
  { id: 'avatar-12', label: 'Plum Minimal', src: '/avatars/avatar-12.webp' },
  { id: 'avatar-13', label: 'Forest Frames', src: '/avatars/avatar-13.webp' },
  { id: 'avatar-14', label: 'Freckled Pixie', src: '/avatars/avatar-14.webp' },
  { id: 'avatar-15', label: 'Slate Braids', src: '/avatars/avatar-15.webp' },
  { id: 'avatar-16', label: 'Clean Poise', src: '/avatars/avatar-16.webp' },
  { id: 'avatar-17', label: 'Copper Cardigan', src: '/avatars/avatar-17.webp' },
  { id: 'avatar-18', label: 'Sand Curl', src: '/avatars/avatar-18.webp' },
]

export const CURATED_AVATAR_MAP = new Map(CURATED_AVATARS.map((a) => [a.id, a]))

export const DEFAULT_AVATAR_ID = 'avatar-01'

export function isValidAvatarId(id: string | null | undefined): boolean {
  if (!id) return false
  return CURATED_AVATAR_MAP.has(id.trim().toLowerCase())
}

/**
 * Resolves either a curated avatar_id or a legacy/fallback profile_image path
 * to a fast local static WebP asset whenever possible.
 */
export function resolveProfileAvatarSrc(
  avatarId?: string | null,
  profileImage?: string | null,
): string | null {
  const cleanId = avatarId?.trim().toLowerCase()
  if (cleanId && CURATED_AVATAR_MAP.has(cleanId)) {
    return CURATED_AVATAR_MAP.get(cleanId)!.src
  }

  if (profileImage) {
    const trimmed = profileImage.trim()
    const match = trimmed.match(/\/avatars\/(avatar-(?:0[1-9]|1[0-8]))\.(?:webp|png|avif|svg)$/i)
    if (match) {
      const matchedId = match[1].toLowerCase()
      return CURATED_AVATAR_MAP.get(matchedId)?.src ?? null
    }
    if (trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
      return trimmed
    }
  }

  return null
}

/**
 * Fallback canonical URL when writing to legacy 10-arg RPCs that require https:// in profile_image.
 */
export function avatarFallbackImageUrl(avatarId: string | null | undefined): string | null {
  if (!avatarId || !CURATED_AVATAR_MAP.has(avatarId)) return null
  return `https://spreadnfc.in/avatars/${avatarId}.webp`
}

