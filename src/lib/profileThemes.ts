import type {
  BusinessThemeId,
  PersonalThemeId,
  ProfileTheme,
  SocialPlatform,
} from '../types'

export interface BusinessThemeConfig {
  id: BusinessThemeId
  name: string
  description: string
  layout: 'centered' | 'executive'
  isDark: boolean
  canvas: string
  card: string
  border: string
  ink: string
  muted: string
  accent: string
  accentText: string
  headerBand?: string
  subtleSurface: string
  swatch: [string, string, string]
}

export interface PersonalThemeConfig {
  id: PersonalThemeId
  name: string
  description: string
  category: 'professional' | 'funky'
  isDark: boolean
  canvas: string
  card: string
  border: string
  ink: string
  muted: string
  accent: string
  subtleSurface: string
  tactileShadow?: string
  borderWidth?: number
  swatch: [string, string, string]
}

export const BUSINESS_THEMES: BusinessThemeConfig[] = [
  {
    id: 'biz_ivory',
    name: 'Editorial Ivory',
    description: 'Clean studio minimalism',
    layout: 'centered',
    isDark: false,
    canvas: '#FAF9F6',
    card: '#FFFFFF',
    border: '#E7E5DF',
    ink: '#161616',
    muted: '#6B6A66',
    accent: '#161616',
    accentText: '#FFFFFF',
    subtleSurface: '#F3F2EE',
    swatch: ['#FAF9F6', '#FFFFFF', '#161616'],
  },
  {
    id: 'biz_obsidian',
    name: 'Matte Obsidian',
    description: 'Architectural dark stone',
    layout: 'centered',
    isDark: true,
    canvas: '#0E0E10',
    card: '#161619',
    border: '#27272B',
    ink: '#F5F5F4',
    muted: '#A1A1AA',
    accent: '#F5F5F4',
    accentText: '#111113',
    subtleSurface: '#1F1F23',
    swatch: ['#0E0E10', '#161619', '#F5F5F4'],
  },
  {
    id: 'biz_sage',
    name: 'Forest & Sage',
    description: 'Executive botanical band',
    layout: 'executive',
    isDark: false,
    canvas: '#F4F6F3',
    card: '#FFFFFF',
    border: '#DCE4DD',
    ink: '#15251D',
    muted: '#5A6E63',
    accent: '#1B4332',
    accentText: '#FFFFFF',
    headerBand: '#1B4332',
    subtleSurface: '#EDF2ED',
    swatch: ['#F4F6F3', '#1B4332', '#DCE4DD'],
  },
  {
    id: 'biz_slate',
    name: 'Executive Navy',
    description: 'Structured corporate band',
    layout: 'executive',
    isDark: false,
    canvas: '#F4F6F9',
    card: '#FFFFFF',
    border: '#DCE3EE',
    ink: '#102138',
    muted: '#5A6B82',
    accent: '#16325B',
    accentText: '#FFFFFF',
    headerBand: '#16325B',
    subtleSurface: '#ECF1F7',
    swatch: ['#F4F6F9', '#16325B', '#DCE3EE'],
  },
  {
    id: 'biz_sand',
    name: 'Warm Sand & Bronze',
    description: 'Hospitality & boutique warmth',
    layout: 'centered',
    isDark: false,
    canvas: '#FBF8F3',
    card: '#FFFFFF',
    border: '#EAE2D6',
    ink: '#231C16',
    muted: '#786B5E',
    accent: '#8C6239',
    accentText: '#FFFFFF',
    subtleSurface: '#F5EFE6',
    swatch: ['#FBF8F3', '#8C6239', '#231C16'],
  },
  {
    id: 'biz_emerald_dark',
    name: 'Deep Emerald',
    description: 'Luxury forest & brushed gold',
    layout: 'executive',
    isDark: true,
    canvas: '#0A1612',
    card: '#11221C',
    border: '#203A31',
    ink: '#F2F6F4',
    muted: '#9AB2A8',
    accent: '#C8A96E',
    accentText: '#0A1612',
    headerBand: '#152E25',
    subtleSurface: '#162C24',
    swatch: ['#0A1612', '#152E25', '#C8A96E'],
  },
]

export const PERSONAL_THEMES: PersonalThemeConfig[] = [
  {
    id: 'per_paper',
    name: 'Minimal Paper',
    description: 'Crisp warm paper',
    category: 'professional',
    isDark: false,
    canvas: '#F7F6F3',
    card: '#FFFFFF',
    border: '#E6E4DF',
    ink: '#141413',
    muted: '#6F6E69',
    accent: '#141413',
    subtleSurface: '#ECEAE4',
    swatch: ['#F7F6F3', '#FFFFFF', '#141413'],
  },
  {
    id: 'per_ink',
    name: 'Noir Studio',
    description: 'Low-glare matte charcoal',
    category: 'professional',
    isDark: true,
    canvas: '#0E0E10',
    card: '#18181B',
    border: '#27272B',
    ink: '#F4F4F2',
    muted: '#A0A09B',
    accent: '#F4F4F2',
    subtleSurface: '#202025',
    swatch: ['#0E0E10', '#18181B', '#F4F4F2'],
  },
  {
    id: 'per_terracotta',
    name: 'Warm Clay',
    description: 'Sunlit earth & terracotta',
    category: 'professional',
    isDark: false,
    canvas: '#FBF5F0',
    card: '#FFFFFF',
    border: '#EDDCD0',
    ink: '#261913',
    muted: '#7D6357',
    accent: '#A84A32',
    subtleSurface: '#F5E7DD',
    swatch: ['#FBF5F0', '#A84A32', '#261913'],
  },
  {
    id: 'per_ocean',
    name: 'Coastal Mist',
    description: 'Airy slate blue',
    category: 'professional',
    isDark: false,
    canvas: '#F2F7FA',
    card: '#FFFFFF',
    border: '#D7E6F0',
    ink: '#0E2433',
    muted: '#567285',
    accent: '#155273',
    subtleSurface: '#E5EFF6',
    swatch: ['#F2F7FA', '#155273', '#0E2433'],
  },
  {
    id: 'per_blush',
    name: 'Soft Rose',
    description: 'Minimal editorial rose',
    category: 'professional',
    isDark: false,
    canvas: '#FCF5F7',
    card: '#FFFFFF',
    border: '#F0DCE2',
    ink: '#2B151E',
    muted: '#7E5C69',
    accent: '#8C3B58',
    subtleSurface: '#F6E5EA',
    swatch: ['#FCF5F7', '#8C3B58', '#2B151E'],
  },
  {
    id: 'per_moss',
    name: 'Botanical Olive',
    description: 'Grounded natural sage',
    category: 'professional',
    isDark: false,
    canvas: '#F4F6F0',
    card: '#FFFFFF',
    border: '#DEE4D5',
    ink: '#19241B',
    muted: '#5F6E61',
    accent: '#35503A',
    subtleSurface: '#E7ECE0',
    swatch: ['#F4F6F0', '#35503A', '#19241B'],
  },
  {
    id: 'per_pop_yellow',
    name: 'Citrus Pop',
    description: 'Sunny yellow & bold ink',
    category: 'funky',
    isDark: false,
    canvas: '#FFE566',
    card: '#FFFDF4',
    border: '#181816',
    ink: '#181816',
    muted: '#4A4637',
    accent: '#181816',
    subtleSurface: '#FFF3B0',
    tactileShadow: '3px 3px 0 #181816',
    borderWidth: 2,
    swatch: ['#FFE566', '#FFFDF4', '#181816'],
  },
  {
    id: 'per_arcade_mint',
    name: 'Mint Arcade',
    description: 'Fresh neon mint & pine',
    category: 'funky',
    isDark: false,
    canvas: '#D6FCEB',
    card: '#FFFFFF',
    border: '#0E2920',
    ink: '#0E2920',
    muted: '#335E50',
    accent: '#059669',
    subtleSurface: '#B9F7DC',
    tactileShadow: '3px 3px 0 #0E2920',
    borderWidth: 2,
    swatch: ['#D6FCEB', '#059669', '#0E2920'],
  },
  {
    id: 'per_sunset_coral',
    name: 'Sunset Coral',
    description: 'Warm peach & punchy coral',
    category: 'funky',
    isDark: false,
    canvas: '#FFE8DC',
    card: '#FFFBF8',
    border: '#2B140E',
    ink: '#2B140E',
    muted: '#734438',
    accent: '#F95738',
    subtleSurface: '#FFD7C2',
    tactileShadow: '3px 3px 0 #2B140E',
    borderWidth: 2,
    swatch: ['#FFE8DC', '#F95738', '#2B140E'],
  },
  {
    id: 'per_cobalt_vibe',
    name: 'Cobalt Spark',
    description: 'Electric blue & crisp ink',
    category: 'funky',
    isDark: false,
    canvas: '#E5EEFF',
    card: '#FFFFFF',
    border: '#0F1B4C',
    ink: '#0F1B4C',
    muted: '#3B4C85',
    accent: '#2563EB',
    subtleSurface: '#D1E0FF',
    tactileShadow: '3px 3px 0 #0F1B4C',
    borderWidth: 2,
    swatch: ['#E5EEFF', '#2563EB', '#0F1B4C'],
  },
]

const BUSINESS_THEME_MAP = new Map(BUSINESS_THEMES.map((t) => [t.id, t]))
const PERSONAL_THEME_MAP = new Map(PERSONAL_THEMES.map((t) => [t.id, t]))

const VALID_THEME_SET = new Set<string>([
  'light',
  'dark',
  ...BUSINESS_THEMES.map((t) => t.id),
  ...PERSONAL_THEMES.map((t) => t.id),
])

export function isValidProfileTheme(value: string | null | undefined): value is ProfileTheme {
  if (!value) return false
  return VALID_THEME_SET.has(value.trim().toLowerCase())
}

export function resolveBusinessTheme(theme: string | null | undefined): BusinessThemeConfig {
  const clean = theme?.trim().toLowerCase()
  if (clean === 'dark') return BUSINESS_THEME_MAP.get('biz_obsidian')!
  if (clean === 'light' || !clean) return BUSINESS_THEME_MAP.get('biz_ivory')!
  return BUSINESS_THEME_MAP.get(clean as BusinessThemeId) ?? BUSINESS_THEME_MAP.get('biz_ivory')!
}

export function resolvePersonalTheme(theme: string | null | undefined): PersonalThemeConfig {
  const clean = theme?.trim().toLowerCase()
  if (clean === 'dark') return PERSONAL_THEME_MAP.get('per_ink')!
  if (clean === 'light' || !clean) return PERSONAL_THEME_MAP.get('per_paper')!
  return PERSONAL_THEME_MAP.get(clean as PersonalThemeId) ?? PERSONAL_THEME_MAP.get('per_paper')!
}

export function isDarkProfileTheme(
  theme: string | null | undefined,
  profileType: 'personal' | 'business' = 'personal',
): boolean {
  if (profileType === 'business') {
    return resolveBusinessTheme(theme).isDark
  }
  return resolvePersonalTheme(theme).isDark
}

export function getLegacyBaseTheme(theme: string | null | undefined): 'light' | 'dark' {
  const clean = theme?.trim().toLowerCase()
  if (clean === 'dark' || clean === 'biz_obsidian' || clean === 'biz_emerald_dark' || clean === 'per_ink') {
    return 'dark'
  }
  return 'light'
}

export function toggleLightDarkVariant(
  theme: string | null | undefined,
  profileType: 'personal' | 'business' = 'personal',
): ProfileTheme {
  const currentlyDark = isDarkProfileTheme(theme, profileType)
  if (profileType === 'business') {
    return currentlyDark ? 'biz_ivory' : 'biz_obsidian'
  }
  return currentlyDark ? 'per_paper' : 'per_ink'
}

/**
 * Extracts a concise, trustworthy handle or domain subtitle for named storefront link cards.
 */
export function formatChannelSubtitle(url: string, platform: SocialPlatform): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./i, '')
    const pathParts = parsed.pathname
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)

    if (
      (platform === 'instagram' ||
        platform === 'x' ||
        platform === 'youtube' ||
        platform === 'tiktok' ||
        platform === 'threads' ||
        platform === 'telegram') &&
      pathParts.length > 0
    ) {
      const first = pathParts[0]
      if (first.startsWith('@')) return first
      if (!['channel', 'watch', 'c', 'user', 'share'].includes(first.toLowerCase())) {
        return `@${first.replace(/^@+/, '')}`
      }
    }

    if (platform === 'linkedin' && pathParts.length >= 2) {
      return `${host}/${pathParts[0]}/${pathParts[1]}`
    }

    return pathParts.length > 0 ? `${host}/${pathParts[0]}` : host
  } catch {
    return url
  }
}

