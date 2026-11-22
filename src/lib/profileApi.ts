import { supabase } from './supabase'
import { invalidateProfileCache, invalidateQrRedirectCache } from './cache'
import { avatarFallbackImageUrl } from './avatars'
import { rpcErrorMessage, type ProfileTheme, type PublicLinkItem, type PublicProfileData, type SocialPlatform } from '../types'

export interface SavePersonalProfileInput {
  sessionToken: string
  qrNumber: string
  previousSlug?: string | null
  profileName: string
  avatarId: string | null
  tagline: string | null
  bio: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  publicSlug: string | null
  theme: ProfileTheme
  isPublished: boolean
  links: Array<{
    platform: SocialPlatform
    link_title: string
    destination_url: string
    icon: string | null
    is_active: boolean
  }>
}

export interface SavePersonalProfileResult {
  ok: boolean
  error?: string
  publicSlug?: string | null
  isPublished?: boolean
}

export async function savePersonalProfile(
  input: SavePersonalProfileInput,
): Promise<SavePersonalProfileResult> {
  const avatarPath = input.avatarId ? `/avatars/${input.avatarId}.webp` : null

  const payload = {
    p_session_token: input.sessionToken,
    p_profile_name: input.profileName,
    p_profile_image: avatarPath,
    p_bio: input.bio,
    p_contact_email: input.contactEmail ?? null,
    p_contact_phone: input.contactPhone ?? null,
    p_public_slug: input.publicSlug,
    p_theme: input.theme,
    p_is_published: input.isPublished,
    p_links: input.links,
    p_tagline: input.tagline,
    p_avatar_id: input.avatarId,
  }

  let { data, error } = await supabase.rpc('customer_save_personal_profile', payload)

  // Graceful fallback if remote database has not yet run PERSONAL_PROFILE_V2_MIGRATION.sql
  if (error?.message && error.message.toLowerCase().includes('could not find the function')) {
    const legacyPayload = {
      p_session_token: input.sessionToken,
      p_profile_name: input.profileName,
      p_profile_image: avatarFallbackImageUrl(input.avatarId),
      p_bio: input.bio,
      p_contact_email: input.contactEmail ?? null,
      p_contact_phone: input.contactPhone ?? null,
      p_public_slug: input.publicSlug,
      p_theme: input.theme,
      p_is_published: input.isPublished,
      p_links: input.links,
    }
    const retry = await supabase.rpc('customer_save_personal_profile', legacyPayload)
    data = retry.data
    error = retry.error
  }

  if (error || !data?.ok) {
    return {
      ok: false,
      error: rpcErrorMessage(data?.error ?? error?.message),
    }
  }

  invalidateQrRedirectCache(input.qrNumber)
  invalidateProfileCache(input.qrNumber)
  if (input.publicSlug) invalidateProfileCache(input.publicSlug)
  if (input.previousSlug && input.previousSlug !== input.publicSlug) {
    invalidateProfileCache(input.previousSlug)
  }

  return {
    ok: true,
    publicSlug: data.public_slug ?? input.publicSlug,
    isPublished: Boolean(data.is_published ?? input.isPublished),
  }
}

export async function checkPublicSlugAvailable(
  sessionToken: string,
  slug: string,
): Promise<{ checked: boolean; available: boolean; reason?: 'invalid_slug' | 'slug_taken' }> {
  const clean = slug.trim().toLowerCase()
  if (!clean) {
    return { checked: true, available: true }
  }

  const { data, error } = await supabase.rpc('check_public_slug_available', {
    p_session_token: sessionToken,
    p_slug: clean,
  })

  if (error || !data?.ok) {
    return { checked: false, available: true }
  }

  return {
    checked: true,
    available: Boolean(data.available),
    reason: data.reason,
  }
}

export interface GetPublicProfileRpcResult {
  ok: boolean
  error?: string
  is_published?: boolean
  qr_number?: string
  profile?: PublicProfileData
  links?: PublicLinkItem[]
}

export async function fetchPublicProfile(identifier: string): Promise<{
  data: GetPublicProfileRpcResult | null
  error: boolean
}> {
  const { data, error } = await supabase.rpc('get_public_profile', {
    p_identifier: identifier,
  })
  if (error || !data) {
    return { data: null, error: true }
  }
  return { data: data as GetPublicProfileRpcResult, error: false }
}

