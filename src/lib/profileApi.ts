import { supabase } from './supabase'
import { invalidateProfileCache, invalidateQrRedirectCache } from './cache'
import { avatarFallbackImageUrl } from './avatars'
import { getLegacyBaseTheme } from './profileThemes'
import {
  rpcErrorMessage,
  type ContactVisibility,
  type MultiQrSummaryItem,
  type ProfileTheme,
  type PublicLinkItem,
  type PublicProfileData,
  type SocialPlatform,
  type UsageType,
} from '../types'

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

  // Graceful fallback if remote database has not yet run PROFILE_THEMES_AND_TEMPLATES_MIGRATION.sql
  if (!error && data?.error === 'invalid_theme') {
    const fallbackTheme = getLegacyBaseTheme(input.theme)
    if (fallbackTheme !== input.theme) {
      const retry = await supabase.rpc('customer_save_personal_profile', {
        ...payload,
        p_theme: fallbackTheme,
      })
      data = retry.data
      error = retry.error
    }
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

export interface SaveBusinessProfileInput {
  sessionToken: string
  qrNumber: string
  previousSlug?: string | null
  businessName: string
  businessCategory: string | null
  location: string | null
  tagline: string | null
  bio: string | null
  profileImage: string | null
  avatarId: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactPersonName?: string | null
  businessExperience?: string | null
  whatsappNumber?: string | null
  fullAddress?: string | null
  workingHours?: string | null
  googleMapsUrl?: string | null
  contactVisibility?: ContactVisibility
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

export async function saveBusinessProfile(
  input: SaveBusinessProfileInput,
): Promise<SavePersonalProfileResult> {
  const payload = {
    p_session_token: input.sessionToken,
    p_business_name: input.businessName,
    p_business_category: input.businessCategory,
    p_location: input.location,
    p_tagline: input.tagline,
    p_bio: input.bio,
    p_profile_image: input.profileImage,
    p_avatar_id: input.avatarId,
    p_contact_email: input.contactEmail,
    p_contact_phone: input.contactPhone,
    p_public_slug: input.publicSlug,
    p_theme: input.theme,
    p_is_published: input.isPublished,
    p_links: input.links,
    p_contact_person_name: input.contactPersonName ?? null,
    p_business_experience: input.businessExperience ?? null,
    p_whatsapp_number: input.whatsappNumber ?? null,
    p_full_address: input.fullAddress ?? null,
    p_working_hours: input.workingHours ?? null,
    p_google_maps_url: input.googleMapsUrl ?? null,
    p_contact_visibility: input.contactVisibility ?? null,
  }

  let { data, error } = await supabase.rpc('customer_save_business_profile', payload)

  // Graceful fallback if remote database has not yet run PROFILE_THEMES_AND_TEMPLATES_MIGRATION.sql
  if (!error && data?.error === 'invalid_theme') {
    const fallbackTheme = getLegacyBaseTheme(input.theme)
    if (fallbackTheme !== input.theme) {
      const retry = await supabase.rpc('customer_save_business_profile', {
        ...payload,
        p_theme: fallbackTheme,
      })
      data = retry.data
      error = retry.error
    }
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

export async function fetchMultiQrSummary(
  sessionTokens: string[],
): Promise<{ ok: boolean; items: MultiQrSummaryItem[] }> {
  if (!sessionTokens.length) return { ok: true, items: [] }

  const { data, error } = await supabase.rpc('customer_get_multi_qr_summary', {
    p_session_tokens: sessionTokens.slice(0, 25),
  })

  if (error || !data?.ok || !Array.isArray(data.items)) {
    return { ok: false, items: [] }
  }

  return {
    ok: true,
    items: data.items as MultiQrSummaryItem[],
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
  usage_type?: UsageType
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

