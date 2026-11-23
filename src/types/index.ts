export type QrStatus = 'active' | 'inactive'
export type UsageType = 'personal' | 'business' | 'business_profile'
export type ProfileType = 'personal' | 'business'
export type BusinessPurpose =
  | 'google_reviews'
  | 'website'
  | 'payment'
  | 'feedback'
  | 'product'
  | 'custom'
export type ProfileTheme = 'light' | 'dark'

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'x'
  | 'whatsapp'
  | 'telegram'
  | 'snapchat'
  | 'pinterest'
  | 'threads'
  | 'website'
  | 'github'
  | 'discord'
  | 'spotify'
  | 'google_reviews'
  | 'google_maps'
  | 'custom'

export interface QrProfileSummary {
  id: string
  profile_type?: ProfileType
  public_slug: string | null
  is_published: boolean
  profile_name: string
  theme: ProfileTheme
  active_link_count?: number
  total_link_count?: number
}

/** Never includes password_hash — admin queries always select an explicit column list. */
export interface QrCode {
  id: string
  qr_number: string
  qr_name: string
  destination_url: string | null
  status: QrStatus
  batch_id: string | null
  password_changed?: boolean
  claimed_at?: string | null
  owner_email?: string | null
  requires_setup_code?: boolean
  usage_type?: UsageType | null
  business_name?: string | null
  business_purpose?: BusinessPurpose | null
  scan_count?: number
  created_at: string
  updated_at: string
}

export interface ContactVisibility {
  phone: boolean
  whatsapp: boolean
  email: boolean
  address: boolean
  maps: boolean
  hours: boolean
  contact_person: boolean
}

export interface QrProfile {
  id: string
  qr_code_id: string
  profile_type?: ProfileType
  profile_name: string
  profile_image: string | null
  avatar_id?: string | null
  business_category?: string | null
  location?: string | null
  contact_person_name?: string | null
  business_experience?: string | null
  whatsapp_number?: string | null
  full_address?: string | null
  working_hours?: string | null
  google_maps_url?: string | null
  contact_visibility?: ContactVisibility
  tagline?: string | null
  bio: string | null
  contact_email: string | null
  contact_phone: string | null
  public_slug: string | null
  theme: ProfileTheme
  is_published: boolean
  created_at?: string
  updated_at?: string
}

export interface QrLink {
  id: string
  qr_profile_id?: string
  platform: SocialPlatform
  link_title: string
  destination_url: string
  icon: string | null
  display_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CustomerQrInfo {
  qr_number: string
  qr_name: string
  status: QrStatus
  usage_type: UsageType | null
  destination_url: string | null
  business_name: string | null
  business_purpose: BusinessPurpose | null
  scan_count: number
  updated_at: string
}

export interface CustomerDashboardData {
  qr: CustomerQrInfo
  profile: QrProfile | null
  links: QrLink[]
}

export interface PublicProfileData {
  profile_type?: ProfileType
  profile_name: string
  profile_image: string | null
  avatar_id?: string | null
  business_category?: string | null
  location?: string | null
  contact_person_name?: string | null
  business_experience?: string | null
  whatsapp_number?: string | null
  full_address?: string | null
  working_hours?: string | null
  google_maps_url?: string | null
  tagline?: string | null
  bio: string | null
  contact_email?: string | null
  contact_phone?: string | null
  public_slug: string | null
  theme: ProfileTheme
}

export interface MultiQrSummaryItem {
  session_token: string
  qr_number: string
  qr_name: string
  status: QrStatus
  usage_type: UsageType | null
  destination_url: string | null
  business_name: string | null
  business_purpose: BusinessPurpose | null
  scan_count: number
  public_slug: string | null
  profile_name: string | null
  is_published: boolean
  active_links_count: number
  updated_at: string
  label?: string
}

export interface PublicLinkItem {
  id: string
  platform: SocialPlatform
  link_title: string
  destination_url: string
  icon: string | null
  display_order: number
}

export interface QrRedirectResult {
  status: QrStatus
  destination_url: string | null
  is_claimed: boolean
  usage_type: UsageType | null
  public_slug: string | null
  is_published: boolean
}

export interface Batch {
  id: string
  batch_name: string
  series_prefix: string
  start_number: string
  end_number: string
  total_qr_codes: number
  created_at: string
  updated_at: string
}

export type PasswordMode = 'common' | 'unique'

export const RPC_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'QR code not found. Please check the QR number and try again.',
  inactive: 'This QR code is inactive. Please contact support.',
  invalid_url: 'Please enter a valid http:// or https:// URL.',
  wrong_password: 'Incorrect password. Please enter the correct password.',
  wrong_setup_code: 'Incorrect setup code. Please check the code printed on your packaging slip.',
  already_claimed: 'This QR card is already activated. Please use your personal password to sign in.',
  password_mismatch: 'Passwords do not match.',
  rate_limited: 'Too many attempts. Please try again later.',
  too_many_attempts: 'Too many incorrect attempts. Temporary cooldown active. Please wait 5 minutes before trying again.',
  missing_setup_code: 'Packaging setup code is required to activate this card.',
  duplicate_qr_number: 'This QR number already exists.',
  invalid_qr_number: 'QR numbers may only contain letters, numbers, hyphens and underscores.',
  missing_qr_name: 'QR name is required.',
  password_too_short: 'Password must be at least 4 characters.',
  invalid_status: 'Invalid status.',
  batch_name_required: 'Batch name is required.',
  invalid_range_format: 'Start and end numbers must be numeric.',
  start_after_end: 'Start number must not be greater than the end number.',
  range_too_large: 'That range is too large (max 5000 QR codes per batch).',
  invalid_prefix: 'Series prefix must be 1-10 letters/numbers.',
  invalid_password_mode: 'Invalid password mode.',
  invalid_default_url: 'Please enter a valid default destination URL.',
  duplicates: 'Some QR numbers in this range already exist.',
  unauthorized: 'Your session has expired or you are not authorized. Please sign in again.',
  mode_locked: 'Account experience mode is locked after setup. Contact support to change it.',
  mode_mismatch: 'This action is not valid for the selected QR mode.',
  invalid_usage_type: 'Please select Personal Profile, Business Direct Link, or Business Profile.',
  invalid_profile_name: 'Please enter a display name (1–80 characters).',
  invalid_profile_image: 'Please choose a valid curated avatar or upload a PNG/JPG/WebP image under 350 KB.',
  invalid_avatar: 'Please choose one of the curated avatars.',
  invalid_tagline: 'Tagline must be 80 characters or fewer.',
  invalid_contact_email: 'Please enter a valid contact email address.',
  invalid_contact_phone: 'Please enter a valid contact phone number (digits, +, spaces, hyphens).',
  invalid_theme: 'Theme must be light or dark.',
  invalid_slug: 'Username must be 3–40 lowercase letters, numbers, hyphens, or underscores, and cannot use a reserved name.',
  slug_taken: 'This custom profile username is already taken. Please choose another.',
  invalid_link_title: 'Every link needs a title (1–80 characters).',
  duplicate_link: 'You already added this exact platform and URL.',
  invalid_links_payload: 'Invalid link collection format.',
  not_personal_profile: 'This QR code is configured for Business direct redirection, not a Personal profile.',
}

export function rpcErrorMessage(code: string | undefined | null): string {
  if (!code) return 'Something went wrong. Please check your Supabase connection and try again.'

  if (RPC_ERROR_MESSAGES[code]) {
    return RPC_ERROR_MESSAGES[code]
  }

  console.error('[Supabase Error Diagnostic]:', code)

  const lower = code.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Database connection failed. Please check your internet or Supabase URL in .env.'
  }
  if (lower.includes('function') && lower.includes('does not exist')) {
    return 'Database function is missing. Please run MULTI_LINK_SYSTEM_MIGRATION.sql in your Supabase SQL Editor.'
  }
  if (lower.includes('relation') && lower.includes('does not exist')) {
    return 'Database tables are missing. Please run MULTI_LINK_SYSTEM_MIGRATION.sql in your Supabase SQL Editor.'
  }
  if (lower.includes('permission denied') || lower.includes('row-level security')) {
    return 'Permission denied. Please verify your Supabase API keys and RLS policies.'
  }

  return code
}
