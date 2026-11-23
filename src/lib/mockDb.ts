import type {
  BusinessPurpose,
  ProfileTheme,
  QrLink,
  QrProfile,
  SocialPlatform,
  UsageType,
} from '../types'
import { isValidProfileTheme } from './profileThemes'
import {
  isValidContactEmail,
  isValidContactPhone,
  isValidDestinationUrl,
  isValidPublicSlug,
} from './validation'

/**
 * Local/Offline High-Performance Mock Database.
 * Powers Spread NFC completely in-memory & localStorage when Supabase credentials are in demo/offline mode.
 */

export interface MockQr {
  id: string
  qr_number: string
  qr_name: string
  destination_url: string | null
  status: 'active' | 'inactive'
  batch_id: string | null
  password: string
  password_changed?: boolean
  claimed_at?: string | null
  owner_email?: string | null
  requires_setup_code?: boolean
  usage_type?: UsageType | null
  business_name?: string | null
  business_purpose?: BusinessPurpose | null
  scan_count: number
  created_at: string
  updated_at: string
}

export interface MockBatch {
  id: string
  batch_name: string
  series_prefix: string
  start_number: string
  end_number: string
  total_qr_codes: number
  created_at: string
  updated_at: string
}

export interface MockSession {
  token: string
  qr_code_id: string
  expires_at: string
}

const QR_STORAGE_KEY = 'spreadnfc_offline_qrs'
const BATCH_STORAGE_KEY = 'spreadnfc_offline_batches'
const PROFILE_STORAGE_KEY = 'spreadnfc_offline_profiles'
const LINK_STORAGE_KEY = 'spreadnfc_offline_links'
const CUSTOMER_SESSION_KEY = 'spreadnfc_offline_customer_sessions'

function initStorage(): {
  qrs: MockQr[]
  batches: MockBatch[]
  profiles: QrProfile[]
  links: QrLink[]
} {
  const existingBatches = localStorage.getItem(BATCH_STORAGE_KEY)
  const existingQrs = localStorage.getItem(QR_STORAGE_KEY)
  const existingProfiles = localStorage.getItem(PROFILE_STORAGE_KEY)
  const existingLinks = localStorage.getItem(LINK_STORAGE_KEY)

  let batches: MockBatch[] = []
  let qrs: MockQr[] = []
  let profiles: QrProfile[] = []
  let links: QrLink[] = []

  if (!existingBatches) {
    batches = [
      {
        id: 'batch-1',
        batch_name: 'September Restaurant Batch',
        series_prefix: 'Z',
        start_number: '100',
        end_number: '105',
        total_qr_codes: 6,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'batch-2',
        batch_name: 'Hotel Lobby Series',
        series_prefix: 'H',
        start_number: '01',
        end_number: '10',
        total_qr_codes: 10,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
    ]
    localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batches))
  } else {
    try {
      batches = JSON.parse(existingBatches)
    } catch {
      batches = []
    }
  }

  if (!existingQrs) {
    qrs = [
      {
        id: 'qr-1',
        qr_number: 'Z100',
        qr_name: 'Rooftop Cafe Menu',
        destination_url: 'https://example.com/menu',
        status: 'active',
        batch_id: 'batch-1',
        password: 'password',
        password_changed: true,
        claimed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        owner_email: 'cafe.owner@example.com',
        requires_setup_code: true,
        usage_type: 'business',
        business_name: 'Rooftop Cafe',
        business_purpose: 'website',
        scan_count: 142,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'qr-2',
        qr_number: 'Z101',
        qr_name: 'Google Review Standee',
        destination_url: 'https://example.com/reviews',
        status: 'active',
        batch_id: 'batch-1',
        password: 'password',
        password_changed: true,
        claimed_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        owner_email: 'bar.manager@example.com',
        requires_setup_code: true,
        usage_type: 'business',
        business_name: 'Bar Counter Lounge',
        business_purpose: 'google_reviews',
        scan_count: 89,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'qr-3',
        qr_number: 'Z102',
        qr_name: 'Personal Creator Card',
        destination_url: null,
        status: 'active',
        batch_id: 'batch-1',
        password: 'password',
        password_changed: true,
        claimed_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        owner_email: 'brijesh@spreadnfc.in',
        requires_setup_code: true,
        usage_type: 'personal',
        business_name: null,
        business_purpose: null,
        scan_count: 45,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: 'qr-4',
        qr_number: 'Z103',
        qr_name: 'Fresh Unclaimed Smart Card',
        destination_url: null,
        status: 'active',
        batch_id: 'batch-1',
        password: 'password',
        password_changed: false,
        claimed_at: null,
        owner_email: null,
        requires_setup_code: true,
        usage_type: null,
        business_name: null,
        business_purpose: null,
        scan_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(qrs))
  } else {
    try {
      qrs = JSON.parse(existingQrs)
    } catch {
      qrs = []
    }
  }

  if (!existingProfiles) {
    profiles = [
      {
        id: 'prof-1',
        qr_code_id: 'qr-3',
        profile_name: 'Brijesh',
        profile_image: null,
        avatar_id: 'avatar-06',
        tagline: 'Founder · Digital Product Builder',
        bio: 'Building smart contactless experiences with SpreadNFC.',
        contact_email: 'hello@spreadnfc.in',
        contact_phone: null,
        public_slug: 'brijesh',
        theme: 'light',
        is_published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles))
  } else {
    try {
      profiles = JSON.parse(existingProfiles)
    } catch {
      profiles = []
    }
  }

  if (!existingLinks) {
    links = [
      {
        id: 'link-1',
        qr_profile_id: 'prof-1',
        platform: 'instagram',
        link_title: 'Instagram',
        destination_url: 'https://instagram.com/spreadnfc',
        icon: null,
        display_order: 0,
        is_active: true,
      },
      {
        id: 'link-2',
        qr_profile_id: 'prof-1',
        platform: 'linkedin',
        link_title: 'LinkedIn',
        destination_url: 'https://linkedin.com/in/spreadnfc',
        icon: null,
        display_order: 1,
        is_active: true,
      },
      {
        id: 'link-3',
        qr_profile_id: 'prof-1',
        platform: 'youtube',
        link_title: 'YouTube',
        destination_url: 'https://youtube.com/@spreadnfc',
        icon: null,
        display_order: 2,
        is_active: true,
      },
      {
        id: 'link-4',
        qr_profile_id: 'prof-1',
        platform: 'website',
        link_title: 'My Website',
        destination_url: 'https://spreadnfc.in',
        icon: null,
        display_order: 3,
        is_active: true,
      },
    ]
    localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links))
  } else {
    try {
      links = JSON.parse(existingLinks)
    } catch {
      links = []
    }
  }

  return { qrs, batches, profiles, links }
}

function getSessions(): MockSession[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_SESSION_KEY) || '[]')
  } catch {
    return []
  }
}

function saveSessions(sessions: MockSession[]) {
  localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(sessions))
}

function issueSession(qrCodeId: string): string {
  const token =
    'mock_' +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  const sessions = getSessions().filter((s) => new Date(s.expires_at).getTime() > Date.now())
  sessions.push({
    token,
    qr_code_id: qrCodeId,
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  })
  saveSessions(sessions)
  return token
}

function verifySession(token: string | undefined | null): string | null {
  if (!token) return null
  const sessions = getSessions()
  const match = sessions.find(
    (s) => s.token === token && new Date(s.expires_at).getTime() > Date.now(),
  )
  return match?.qr_code_id ?? null
}

export const mockDb = {
  getQrs(): MockQr[] {
    return initStorage().qrs
  },

  saveQrs(qrs: MockQr[]): void {
    localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(qrs))
  },

  getBatches(): MockBatch[] {
    return initStorage().batches
  },

  saveBatches(batches: MockBatch[]): void {
    localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batches))
  },

  getProfiles(): QrProfile[] {
    return initStorage().profiles
  },

  saveProfiles(profiles: QrProfile[]): void {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles))
  },

  getLinks(): QrLink[] {
    return initStorage().links
  },

  saveLinks(links: QrLink[]): void {
    localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(links))
  },

  createSingleQr(params: {
    p_qr_number: string
    p_qr_name: string
    p_destination_url?: string | null
    p_password?: string
    p_status?: 'active' | 'inactive'
  }) {
    const qrs = this.getQrs()
    const norm = params.p_qr_number.trim().toUpperCase()
    const cleanUrl = params.p_destination_url ? params.p_destination_url.trim() : null

    if (qrs.some((q) => q.qr_number.toUpperCase() === norm)) {
      return { data: { ok: false, error: 'duplicate_qr_number' }, error: null }
    }

    const newQr: MockQr = {
      id: 'qr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      qr_number: norm,
      qr_name: params.p_qr_name.trim(),
      destination_url: cleanUrl,
      status: params.p_status ?? 'active',
      batch_id: null,
      password: params.p_password ?? '123456',
      password_changed: false,
      claimed_at: null,
      owner_email: null,
      requires_setup_code: true,
      usage_type: cleanUrl ? 'business' : null,
      business_name: null,
      business_purpose: null,
      scan_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    qrs.unshift(newQr)
    this.saveQrs(qrs)
    return { data: { ok: true, qr_number: norm }, error: null }
  },

  createBatch(params: {
    p_batch_name: string
    p_series_prefix: string
    p_start_number: string
    p_end_number: string
    p_password_mode: 'common' | 'unique'
    p_common_password?: string | null
    p_default_url?: string | null
    p_dry_run: boolean
  }) {
    const qrs = this.getQrs()
    const batches = this.getBatches()

    const start = parseInt(params.p_start_number, 10)
    const end = parseInt(params.p_end_number, 10)
    const padLen = params.p_start_number.length
    const prefix = params.p_series_prefix.trim().toUpperCase()
    const total = end - start + 1

    if (total <= 0) return { data: { ok: false, error: 'start_after_end' }, error: null }
    if (total > 5000) return { data: { ok: false, error: 'range_too_large' }, error: null }

    const first = prefix + String(start).padStart(padLen, '0')
    const last = prefix + String(end).padStart(padLen, '0')

    const conflicts: string[] = []
    const generatedNums: string[] = []

    for (let i = start; i <= end; i++) {
      const num = prefix + String(i).padStart(padLen, '0')
      generatedNums.push(num)
      if (qrs.some((q) => q.qr_number.toUpperCase() === num)) {
        conflicts.push(num)
      }
    }

    if (conflicts.length > 0) {
      return { data: { ok: false, error: 'duplicates', conflicts }, error: null }
    }

    if (params.p_dry_run) {
      return { data: { ok: true, total, first, last }, error: null }
    }

    const batchId = 'batch-' + Date.now()
    const newBatch: MockBatch = {
      id: batchId,
      batch_name: params.p_batch_name.trim(),
      series_prefix: prefix,
      start_number: params.p_start_number,
      end_number: params.p_end_number,
      total_qr_codes: total,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    batches.unshift(newBatch)
    this.saveBatches(batches)

    const passwordsList: { qr_number: string; password: string }[] = []
    const newQrs: MockQr[] = []
    const cleanDefaultUrl = params.p_default_url?.trim() || null

    for (let i = 0; i < generatedNums.length; i++) {
      const num = generatedNums[i]
      const pwd =
        params.p_password_mode === 'common'
          ? params.p_common_password || '123456'
          : Math.random().toString(36).slice(2, 8).toUpperCase()

      if (params.p_password_mode === 'unique') {
        passwordsList.push({ qr_number: num, password: pwd })
      }

      newQrs.push({
        id: 'qr-' + Date.now() + '-' + i,
        qr_number: num,
        qr_name: `${params.p_batch_name} #${start + i}`,
        destination_url: cleanDefaultUrl,
        status: 'active',
        batch_id: batchId,
        password: pwd,
        password_changed: false,
        claimed_at: null,
        owner_email: null,
        requires_setup_code: true,
        usage_type: cleanDefaultUrl ? 'business' : null,
        business_name: null,
        business_purpose: null,
        scan_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    this.saveQrs([...newQrs, ...qrs])

    return {
      data: {
        ok: true,
        batch_id: batchId,
        total,
        password_mode: params.p_password_mode,
        passwords: params.p_password_mode === 'unique' ? passwordsList : null,
      },
      error: null,
    }
  },

  processCsv(params: { p_rows: Record<string, string>[]; p_dry_run: boolean }) {
    const qrs = this.getQrs()
    const errors: { row: number; qr_number?: string; error: string }[] = []
    const seenInFile = new Set<string>()
    let validCount = 0

    const toInsert: MockQr[] = []

    for (let i = 0; i < params.p_rows.length; i++) {
      const r = params.p_rows[i]
      const rowIdx = i + 1
      const num = (r.qr_number || '').trim().toUpperCase()
      const name = (r.qr_name || '').trim() || num
      const url = (r.destination_url || '').trim() || null
      const pwd = (r.password || '').trim() || '123456'

      if (!num) {
        errors.push({ row: rowIdx, error: 'missing_qr_number' })
        continue
      }
      if (seenInFile.has(num)) {
        errors.push({ row: rowIdx, qr_number: num, error: 'duplicate_in_file' })
        continue
      }
      seenInFile.add(num)

      if (qrs.some((q) => q.qr_number.toUpperCase() === num)) {
        errors.push({ row: rowIdx, qr_number: num, error: 'already_exists' })
        continue
      }

      if (pwd.length < 4) {
        errors.push({ row: rowIdx, qr_number: num, error: 'invalid_password' })
        continue
      }

      validCount++
      if (!params.p_dry_run) {
        toInsert.push({
          id: 'qr-' + Date.now() + '-' + i,
          qr_number: num,
          qr_name: name,
          destination_url: url,
          status: 'active',
          batch_id: null,
          password: pwd,
          password_changed: false,
          claimed_at: null,
          owner_email: null,
          requires_setup_code: true,
          usage_type: url ? 'business' : null,
          business_name: null,
          business_purpose: null,
          scan_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (!params.p_dry_run && toInsert.length > 0) {
      this.saveQrs([...toInsert, ...qrs])
    }

    return {
      data: {
        ok: true,
        total: params.p_rows.length,
        valid_count: validCount,
        error_count: errors.length,
        errors,
        created: toInsert.length,
      },
      error: null,
    }
  },

  resetPassword(params: { p_qr_id: string; p_new_password: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.id === params.p_qr_id)
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    target.password = params.p_new_password
    target.updated_at = new Date().toISOString()
    this.saveQrs(qrs)
    return { data: { ok: true }, error: null }
  },

  resetQrUnclaimed(params: { p_qr_id: string; p_new_setup_code: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.id === params.p_qr_id)
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    target.password = params.p_new_setup_code.trim()
    target.password_changed = false
    target.claimed_at = null
    target.owner_email = null
    target.updated_at = new Date().toISOString()
    this.saveQrs(qrs)
    return { data: { ok: true }, error: null }
  },

  adminSetUsageType(params: { p_qr_id: string; p_usage_type: UsageType | null }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.id === params.p_qr_id)
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    target.usage_type = params.p_usage_type
    target.updated_at = new Date().toISOString()
    this.saveQrs(qrs)

    if (params.p_usage_type === 'personal' || params.p_usage_type === 'business_profile') {
      const profiles = this.getProfiles()
      const existing = profiles.find((p) => p.qr_code_id === target.id)
      const nextProfileType = params.p_usage_type === 'business_profile' ? 'business' : 'personal'
      if (!existing) {
        profiles.push({
          id: 'prof-' + Date.now(),
          qr_code_id: target.id,
          profile_type: nextProfileType,
          profile_name:
            params.p_usage_type === 'business_profile'
              ? target.business_name || target.qr_name || target.qr_number
              : target.qr_name || target.qr_number,
          profile_image: null,
          bio: null,
          contact_email: null,
          contact_phone: null,
          public_slug: null,
          theme: 'light',
          is_published: false,
        })
      } else {
        existing.profile_type = nextProfileType
      }
      this.saveProfiles(profiles)
    }

    return { data: { ok: true, qr_number: target.qr_number, usage_type: params.p_usage_type }, error: null }
  },

  requestQrUpdate(params: { p_qr_number: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.qr_number.toUpperCase() === params.p_qr_number.trim().toUpperCase())
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    if (target.status !== 'active') return { data: { ok: false, error: 'inactive' }, error: null }

    const profile = this.getProfiles().find((p) => p.qr_code_id === target.id)
    return {
      data: {
        ok: true,
        is_claimed: !!target.password_changed,
        destination_url: target.destination_url,
        qr_number: target.qr_number,
        requires_setup_code: target.requires_setup_code !== false,
        usage_type: target.usage_type ?? null,
        business_name: target.business_name ?? null,
        business_purpose: target.business_purpose ?? null,
        public_slug: profile?.public_slug ?? null,
      },
      error: null,
    }
  },

  verifySetupCode(params: { p_qr_number: string; p_setup_code: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.qr_number.toUpperCase() === params.p_qr_number.trim().toUpperCase())
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    if (target.status !== 'active') return { data: { ok: false, error: 'inactive' }, error: null }
    if (target.password_changed) return { data: { ok: false, error: 'already_claimed' }, error: null }
    if (target.requires_setup_code === false) {
      return { data: { ok: true, requires_setup_code: false }, error: null }
    }
    if (
      target.password.trim() !== params.p_setup_code.trim() &&
      target.password.trim() !== params.p_setup_code.trim().toUpperCase()
    ) {
      return { data: { ok: false, error: 'wrong_setup_code' }, error: null }
    }
    return { data: { ok: true, requires_setup_code: true }, error: null }
  },

  claimQr(params: {
    p_qr_number: string
    p_setup_code?: string | null
    p_new_password: string
    p_destination_url?: string | null
    p_owner_email?: string | null
    p_usage_type?: UsageType | null
  }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.qr_number.toUpperCase() === params.p_qr_number.trim().toUpperCase())
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    if (target.status !== 'active') return { data: { ok: false, error: 'inactive' }, error: null }
    if (target.password_changed) return { data: { ok: false, error: 'already_claimed' }, error: null }

    if (target.requires_setup_code !== false) {
      const code = params.p_setup_code?.trim() || ''
      if (!code) return { data: { ok: false, error: 'missing_setup_code' }, error: null }
      if (target.password.trim() !== code && target.password.trim() !== code.toUpperCase()) {
        return { data: { ok: false, error: 'wrong_setup_code' }, error: null }
      }
    }

    if (!params.p_new_password || params.p_new_password.length < 4) {
      return { data: { ok: false, error: 'password_too_short' }, error: null }
    }

    const cleanUrl = params.p_destination_url?.trim() || null
    if (cleanUrl && !isValidDestinationUrl(cleanUrl)) {
      return { data: { ok: false, error: 'invalid_url' }, error: null }
    }

    target.password = params.p_new_password
    target.password_changed = true
    target.claimed_at = new Date().toISOString()
    if (cleanUrl) target.destination_url = cleanUrl
    if (params.p_owner_email) target.owner_email = params.p_owner_email.trim()
    target.usage_type = params.p_usage_type ?? target.usage_type ?? (cleanUrl ? 'business' : null)
    target.updated_at = new Date().toISOString()
    this.saveQrs(qrs)

    const sessionToken = issueSession(target.id)
    return {
      data: {
        ok: true,
        qr_number: target.qr_number,
        usage_type: target.usage_type,
        session_token: sessionToken,
      },
      error: null,
    }
  },

  loginQr(params: { p_qr_number: string; p_password: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.qr_number.toUpperCase() === params.p_qr_number.trim().toUpperCase())
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    if (target.status !== 'active') return { data: { ok: false, error: 'inactive' }, error: null }
    if (target.password !== params.p_password) {
      return { data: { ok: false, error: 'wrong_password' }, error: null }
    }

    if (!target.usage_type && target.destination_url) {
      target.usage_type = 'business'
      this.saveQrs(qrs)
    }

    const sessionToken = issueSession(target.id)
    return {
      data: {
        ok: true,
        session_token: sessionToken,
        qr_number: target.qr_number,
        usage_type: target.usage_type ?? null,
      },
      error: null,
    }
  },

  getCustomerDashboard(params: { p_session_token: string }) {
    const qrId = verifySession(params.p_session_token)
    if (!qrId) return { data: { ok: false, error: 'unauthorized' }, error: null }

    const qr = this.getQrs().find((q) => q.id === qrId)
    if (!qr) return { data: { ok: false, error: 'not_found' }, error: null }

    const profile = this.getProfiles().find((p) => p.qr_code_id === qrId) ?? null
    const links = profile
      ? this.getLinks()
          .filter((l) => l.qr_profile_id === profile.id)
          .sort((a, b) => a.display_order - b.display_order)
      : []

    return {
      data: {
        ok: true,
        qr: {
          qr_number: qr.qr_number,
          qr_name: qr.qr_name,
          status: qr.status,
          usage_type: qr.usage_type ?? null,
          destination_url: qr.destination_url,
          business_name: qr.business_name ?? null,
          business_purpose: qr.business_purpose ?? null,
          scan_count: qr.scan_count ?? 0,
          updated_at: qr.updated_at,
        },
        profile,
        links,
      },
      error: null,
    }
  },

  selectUsageMode(params: { p_session_token: string; p_usage_type: UsageType }) {
    const qrId = verifySession(params.p_session_token)
    if (!qrId) return { data: { ok: false, error: 'unauthorized' }, error: null }

    const qrs = this.getQrs()
    const target = qrs.find((q) => q.id === qrId)
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }

    if (target.usage_type && target.usage_type !== params.p_usage_type) {
      return { data: { ok: false, error: 'mode_locked' }, error: null }
    }

    if (params.p_usage_type !== 'personal' && params.p_usage_type !== 'business' && params.p_usage_type !== 'business_profile') {
      return { data: { ok: false, error: 'invalid_usage_type' }, error: null }
    }

    target.usage_type = params.p_usage_type
    target.updated_at = new Date().toISOString()
    this.saveQrs(qrs)

    if (params.p_usage_type === 'personal' || params.p_usage_type === 'business_profile') {
      const profiles = this.getProfiles()
      const existing = profiles.find((p) => p.qr_code_id === qrId)
      const nextProfileType = params.p_usage_type === 'business_profile' ? 'business' : 'personal'
      if (!existing) {
        profiles.push({
          id: 'prof-' + Date.now(),
          qr_code_id: qrId,
          profile_type: nextProfileType,
          profile_name: '',
          profile_image: null,
          bio: null,
          contact_email: null,
          contact_phone: null,
          public_slug: null,
          theme: 'light',
          is_published: false,
        })
      } else {
        existing.profile_type = nextProfileType
      }
      this.saveProfiles(profiles)
    }

    return { data: { ok: true, usage_type: params.p_usage_type, qr_number: target.qr_number }, error: null }
  },

  savePersonalProfile(params: {
    p_session_token: string
    p_profile_name: string
    p_profile_image?: string | null
    p_bio?: string | null
    p_contact_email?: string | null
    p_contact_phone?: string | null
    p_public_slug?: string | null
    p_theme?: ProfileTheme
    p_is_published?: boolean
    p_links?: Array<{
      platform: SocialPlatform
      link_title: string
      destination_url: string
      icon?: string | null
      is_active?: boolean
    }>
    p_tagline?: string | null
    p_avatar_id?: string | null
  }) {
    const qrId = verifySession(params.p_session_token)
    if (!qrId) return { data: { ok: false, error: 'unauthorized' }, error: null }

    const qrs = this.getQrs()
    const qr = qrs.find((q) => q.id === qrId)
    if (!qr) return { data: { ok: false, error: 'not_found' }, error: null }
    if (qr.usage_type !== 'personal') return { data: { ok: false, error: 'mode_mismatch' }, error: null }

    const cleanName = (params.p_profile_name || '').trim()
    if (!cleanName || cleanName.length > 80) {
      return { data: { ok: false, error: 'invalid_profile_name' }, error: null }
    }

    const cleanSlug = params.p_public_slug?.trim().toLowerCase() || null
    if (cleanSlug && !isValidPublicSlug(cleanSlug)) {
      return { data: { ok: false, error: 'invalid_slug' }, error: null }
    }

    const profiles = this.getProfiles()
    if (cleanSlug) {
      const conflictProfile = profiles.find(
        (p) => p.public_slug?.toLowerCase() === cleanSlug && p.qr_code_id !== qrId,
      )
      const conflictQr = qrs.find((q) => q.qr_number.toLowerCase() === cleanSlug && q.id !== qrId)
      if (conflictProfile || conflictQr) {
        return { data: { ok: false, error: 'slug_taken' }, error: null }
      }
    }

    const rawLinks = params.p_links ?? []
    const seen = new Set<string>()
    for (const l of rawLinks) {
      if (!l.link_title?.trim()) return { data: { ok: false, error: 'invalid_link_title' }, error: null }
      if (!isValidDestinationUrl(l.destination_url)) {
        return { data: { ok: false, error: 'invalid_url' }, error: null }
      }
      const key = `${l.platform}|${l.destination_url.toLowerCase()}`
      if (seen.has(key)) return { data: { ok: false, error: 'duplicate_link' }, error: null }
      seen.add(key)
    }

    const cleanTagline = params.p_tagline?.trim().slice(0, 80) || null
    const cleanAvatarId = params.p_avatar_id?.trim().toLowerCase() || null

    let profile = profiles.find((p) => p.qr_code_id === qrId)
    if (!profile) {
      profile = {
        id: 'prof-' + Date.now(),
        qr_code_id: qrId,
        profile_name: cleanName,
        profile_image: params.p_profile_image || null,
        avatar_id: cleanAvatarId,
        tagline: cleanTagline,
        bio: params.p_bio?.trim() || null,
        contact_email: params.p_contact_email?.trim() || null,
        contact_phone: params.p_contact_phone?.trim() || null,
        public_slug: cleanSlug,
        theme: isValidProfileTheme(params.p_theme) ? params.p_theme : 'light',
        is_published: Boolean(params.p_is_published),
      }
      profiles.push(profile)
    } else {
      profile.profile_name = cleanName
      profile.profile_image = params.p_profile_image || null
      profile.avatar_id = cleanAvatarId ?? profile.avatar_id ?? null
      profile.tagline = cleanTagline
      profile.bio = params.p_bio?.trim() || null
      profile.contact_email = params.p_contact_email?.trim() || null
      profile.contact_phone = params.p_contact_phone?.trim() || null
      profile.public_slug = cleanSlug
      profile.theme = isValidProfileTheme(params.p_theme) ? params.p_theme : 'light'
      profile.is_published = Boolean(params.p_is_published)
      profile.updated_at = new Date().toISOString()
    }
    this.saveProfiles(profiles)

    const otherLinks = this.getLinks().filter((l) => l.qr_profile_id !== profile!.id)
    const nextLinks: QrLink[] = rawLinks.map((l, idx) => ({
      id: `link-${Date.now()}-${idx}`,
      qr_profile_id: profile!.id,
      platform: l.platform || 'custom',
      link_title: l.link_title.trim(),
      destination_url: l.destination_url.trim(),
      icon: l.icon || null,
      display_order: idx,
      is_active: l.is_active !== false,
    }))
    this.saveLinks([...otherLinks, ...nextLinks])

    return {
      data: {
        ok: true,
        profile_id: profile.id,
        public_slug: profile.public_slug,
        qr_number: qr.qr_number,
        is_published: profile.is_published,
      },
      error: null,
    }
  },

  saveBusinessProfile(params: {
    p_session_token: string
    p_business_name: string
    p_business_category?: string | null
    p_location?: string | null
    p_tagline?: string | null
    p_bio?: string | null
    p_profile_image?: string | null
    p_avatar_id?: string | null
    p_contact_email?: string | null
    p_contact_phone?: string | null
    p_contact_person_name?: string | null
    p_business_experience?: string | null
    p_whatsapp_number?: string | null
    p_full_address?: string | null
    p_working_hours?: string | null
    p_google_maps_url?: string | null
    p_contact_visibility?: {
      phone?: boolean
      whatsapp?: boolean
      email?: boolean
      address?: boolean
      maps?: boolean
      hours?: boolean
      contact_person?: boolean
    } | null
    p_public_slug?: string | null
    p_theme?: ProfileTheme
    p_is_published?: boolean
    p_links?: Array<{
      platform: SocialPlatform
      link_title: string
      destination_url: string
      icon?: string | null
      is_active?: boolean
    }>
  }) {
    const qrId = verifySession(params.p_session_token)
    if (!qrId) return { data: { ok: false, error: 'unauthorized' }, error: null }

    const qrs = this.getQrs()
    const qr = qrs.find((q) => q.id === qrId)
    if (!qr) return { data: { ok: false, error: 'not_found' }, error: null }
    if (qr.usage_type !== 'business_profile') return { data: { ok: false, error: 'mode_mismatch' }, error: null }

    const cleanName = (params.p_business_name || '').trim()
    if (!cleanName || cleanName.length > 80) {
      return { data: { ok: false, error: 'invalid_profile_name' }, error: null }
    }

    const cleanEmail = params.p_contact_email?.trim() || null
    if (cleanEmail && !isValidContactEmail(cleanEmail)) {
      return { data: { ok: false, error: 'invalid_contact_email' }, error: null }
    }

    const cleanPhone = params.p_contact_phone?.trim() || null
    if (cleanPhone && !isValidContactPhone(cleanPhone)) {
      return { data: { ok: false, error: 'invalid_contact_phone' }, error: null }
    }

    const cleanWhatsapp = params.p_whatsapp_number?.trim() || null
    if (cleanWhatsapp && !isValidContactPhone(cleanWhatsapp)) {
      return { data: { ok: false, error: 'invalid_contact_phone' }, error: null }
    }

    const cleanMapsUrl = params.p_google_maps_url?.trim() || null
    if (cleanMapsUrl && !isValidDestinationUrl(cleanMapsUrl)) {
      return { data: { ok: false, error: 'invalid_url' }, error: null }
    }

    const cleanVisibility = {
      phone: params.p_contact_visibility?.phone !== false,
      whatsapp: params.p_contact_visibility?.whatsapp !== false,
      email: params.p_contact_visibility?.email !== false,
      address: params.p_contact_visibility?.address !== false,
      maps: params.p_contact_visibility?.maps !== false,
      hours: params.p_contact_visibility?.hours !== false,
      contact_person: params.p_contact_visibility?.contact_person !== false,
    }

    const cleanSlug = params.p_public_slug?.trim().toLowerCase() || null
    if (cleanSlug && !isValidPublicSlug(cleanSlug)) {
      return { data: { ok: false, error: 'invalid_slug' }, error: null }
    }

    const profiles = this.getProfiles()
    if (cleanSlug) {
      const conflictProfile = profiles.find(
        (p) => p.public_slug?.toLowerCase() === cleanSlug && p.qr_code_id !== qrId,
      )
      const conflictQr = qrs.find((q) => q.qr_number.toLowerCase() === cleanSlug && q.id !== qrId)
      if (conflictProfile || conflictQr) {
        return { data: { ok: false, error: 'slug_taken' }, error: null }
      }
    }

    const rawLinks = params.p_links ?? []
    if (!Array.isArray(rawLinks) || rawLinks.length > 50) {
      return { data: { ok: false, error: 'invalid_links_payload' }, error: null }
    }

    const seen = new Set<string>()
    for (const l of rawLinks) {
      if (!l.link_title?.trim() || l.link_title.trim().length > 80) {
        return { data: { ok: false, error: 'invalid_link_title' }, error: null }
      }
      if (!isValidDestinationUrl(l.destination_url)) {
        return { data: { ok: false, error: 'invalid_url' }, error: null }
      }
      const key = `${l.platform}|${l.destination_url.toLowerCase()}`
      if (seen.has(key)) return { data: { ok: false, error: 'duplicate_link' }, error: null }
      seen.add(key)
    }

    const cleanCategory = params.p_business_category?.trim().slice(0, 60) || null
    const cleanLocation = params.p_location?.trim().slice(0, 80) || null
    const cleanTagline = params.p_tagline?.trim().slice(0, 80) || null
    const cleanAvatarId = params.p_avatar_id?.trim().toLowerCase() || null
    const cleanPerson = params.p_contact_person_name?.trim().slice(0, 80) || null
    const cleanExp = params.p_business_experience?.trim().slice(0, 60) || null
    const cleanAddress = params.p_full_address?.trim().slice(0, 240) || null
    const cleanHours = params.p_working_hours?.trim().slice(0, 120) || null

    let profile = profiles.find((p) => p.qr_code_id === qrId)
    if (!profile) {
      profile = {
        id: 'prof-' + Date.now(),
        qr_code_id: qrId,
        profile_type: 'business',
        profile_name: cleanName,
        business_category: cleanCategory,
        location: cleanLocation,
        profile_image: params.p_profile_image || null,
        avatar_id: cleanAvatarId,
        tagline: cleanTagline,
        bio: params.p_bio?.trim().slice(0, 280) || null,
        contact_email: cleanEmail,
        contact_phone: cleanPhone,
        contact_person_name: cleanPerson,
        business_experience: cleanExp,
        whatsapp_number: cleanWhatsapp,
        full_address: cleanAddress,
        working_hours: cleanHours,
        google_maps_url: cleanMapsUrl,
        contact_visibility: cleanVisibility,
        public_slug: cleanSlug,
        theme: isValidProfileTheme(params.p_theme) ? params.p_theme : 'light',
        is_published: Boolean(params.p_is_published),
      }
      profiles.push(profile)
    } else {
      profile.profile_type = 'business'
      profile.profile_name = cleanName
      profile.business_category = cleanCategory
      profile.location = cleanLocation
      profile.profile_image = params.p_profile_image || null
      profile.avatar_id = cleanAvatarId
      profile.tagline = cleanTagline
      profile.bio = params.p_bio?.trim().slice(0, 280) || null
      profile.contact_email = cleanEmail
      profile.contact_phone = cleanPhone
      profile.contact_person_name = cleanPerson
      profile.business_experience = cleanExp
      profile.whatsapp_number = cleanWhatsapp
      profile.full_address = cleanAddress
      profile.working_hours = cleanHours
      profile.google_maps_url = cleanMapsUrl
      profile.contact_visibility = cleanVisibility
      profile.public_slug = cleanSlug
      profile.theme = isValidProfileTheme(params.p_theme) ? params.p_theme : 'light'
      profile.is_published = Boolean(params.p_is_published)
      profile.updated_at = new Date().toISOString()
    }
    this.saveProfiles(profiles)

    qr.business_name = cleanName
    qr.updated_at = new Date().toISOString()
    this.saveQrs(qrs)

    const otherLinks = this.getLinks().filter((l) => l.qr_profile_id !== profile!.id)
    const nextLinks: QrLink[] = rawLinks.map((l, idx) => ({
      id: `link-${Date.now()}-${idx}`,
      qr_profile_id: profile!.id,
      platform: l.platform || 'custom',
      link_title: l.link_title.trim(),
      destination_url: l.destination_url.trim(),
      icon: l.icon || null,
      display_order: idx,
      is_active: l.is_active !== false,
    }))
    this.saveLinks([...otherLinks, ...nextLinks])

    return {
      data: {
        ok: true,
        profile_id: profile.id,
        public_slug: profile.public_slug,
        qr_number: qr.qr_number,
        is_published: profile.is_published,
      },
      error: null,
    }
  },

  getMultiQrSummary(params: { p_session_tokens?: string[] }) {
    const tokens = Array.isArray(params.p_session_tokens) ? params.p_session_tokens.slice(0, 25) : []
    const qrs = this.getQrs()
    const profiles = this.getProfiles()
    const links = this.getLinks()
    const seen = new Set<string>()
    const items = []

    for (const tok of tokens) {
      const qrId = verifySession(tok)
      if (!qrId || seen.has(qrId)) continue
      const qr = qrs.find((q) => q.id === qrId && q.status === 'active')
      if (!qr) continue
      seen.add(qrId)
      const profile = profiles.find((p) => p.qr_code_id === qr.id)
      const activeCount = profile
        ? links.filter((l) => l.qr_profile_id === profile.id && l.is_active).length
        : 0

      items.push({
        session_token: tok,
        qr_number: qr.qr_number,
        qr_name: qr.qr_name,
        status: qr.status,
        usage_type: qr.usage_type ?? null,
        destination_url: qr.destination_url,
        business_name: qr.business_name ?? null,
        business_purpose: qr.business_purpose ?? null,
        scan_count: qr.scan_count ?? 0,
        public_slug: profile?.public_slug ?? null,
        profile_name: profile?.profile_name ?? null,
        is_published: Boolean(profile?.is_published),
        active_links_count: activeCount,
        updated_at: qr.updated_at,
      })
    }

    return { data: { ok: true, items }, error: null }
  },

  saveBusinessSettings(params: {
    p_session_token: string
    p_business_name?: string | null
    p_business_purpose?: BusinessPurpose
    p_destination_url: string
  }) {
    const qrId = verifySession(params.p_session_token)
    if (!qrId) return { data: { ok: false, error: 'unauthorized' }, error: null }

    const qrs = this.getQrs()
    const qr = qrs.find((q) => q.id === qrId)
    if (!qr) return { data: { ok: false, error: 'not_found' }, error: null }
    if (qr.usage_type !== 'business') return { data: { ok: false, error: 'mode_mismatch' }, error: null }

    const cleanUrl = params.p_destination_url.trim()
    if (!isValidDestinationUrl(cleanUrl)) return { data: { ok: false, error: 'invalid_url' }, error: null }

    qr.business_name = params.p_business_name?.trim() || null
    qr.business_purpose = params.p_business_purpose || 'custom'
    qr.destination_url = cleanUrl
    qr.updated_at = new Date().toISOString()
    this.saveQrs(qrs)

    return {
      data: {
        ok: true,
        qr_number: qr.qr_number,
        destination_url: cleanUrl,
        business_purpose: qr.business_purpose,
      },
      error: null,
    }
  },

  customerChangePassword(params: {
    p_session_token: string
    p_current_password: string
    p_new_password: string
  }) {
    const qrId = verifySession(params.p_session_token)
    if (!qrId) return { data: { ok: false, error: 'unauthorized' }, error: null }
    if (!params.p_new_password || params.p_new_password.length < 4) {
      return { data: { ok: false, error: 'password_too_short' }, error: null }
    }
    const qrs = this.getQrs()
    const qr = qrs.find((q) => q.id === qrId)
    if (!qr) return { data: { ok: false, error: 'not_found' }, error: null }
    if (qr.password !== params.p_current_password) {
      return { data: { ok: false, error: 'wrong_password' }, error: null }
    }
    qr.password = params.p_new_password
    qr.updated_at = new Date().toISOString()
    this.saveQrs(qrs)
    return { data: { ok: true }, error: null }
  },

  confirmQrUpdate(params: { p_qr_number: string; p_new_url: string; p_password: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.qr_number.toUpperCase() === params.p_qr_number.trim().toUpperCase())
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    if (target.status !== 'active') return { data: { ok: false, error: 'inactive' }, error: null }
    if (target.usage_type === 'personal' || target.usage_type === 'business_profile') {
      return { data: { ok: false, error: 'mode_mismatch' }, error: null }
    }
    if (!isValidDestinationUrl(params.p_new_url)) return { data: { ok: false, error: 'invalid_url' }, error: null }
    if (target.password !== params.p_password) {
      return { data: { ok: false, error: 'wrong_password' }, error: null }
    }
    target.destination_url = params.p_new_url.trim()
    target.usage_type = target.usage_type ?? 'business'
    target.updated_at = new Date().toISOString()
    this.saveQrs(qrs)
    return { data: { ok: true }, error: null }
  },

  checkPublicSlugAvailable(params: { p_session_token: string; p_slug: string }) {
    const qrId = verifySession(params.p_session_token)
    if (!qrId) return { data: { ok: false, error: 'unauthorized' }, error: null }

    const clean = (params.p_slug || '').trim().toLowerCase()
    if (!clean) return { data: { ok: true, available: true }, error: null }
    if (!isValidPublicSlug(clean)) {
      return { data: { ok: true, available: false, reason: 'invalid_slug' }, error: null }
    }

    const qrs = this.getQrs()
    const profiles = this.getProfiles()
    const takenByProfile = profiles.some(
      (p) => p.public_slug?.toLowerCase() === clean && p.qr_code_id !== qrId,
    )
    const takenByQr = qrs.some((q) => q.qr_number.toLowerCase() === clean && q.id !== qrId)
    if (takenByProfile || takenByQr) {
      return { data: { ok: true, available: false, reason: 'slug_taken' }, error: null }
    }
    return { data: { ok: true, available: true }, error: null }
  },

  getPublicProfile(params: { p_identifier: string }) {
    const clean = (params.p_identifier || '').trim()
    if (!clean) return { data: { ok: false, error: 'not_found' }, error: null }

    const qrs = this.getQrs()
    const profiles = this.getProfiles()

    let profile = profiles.find((p) => p.public_slug?.toLowerCase() === clean.toLowerCase())
    let qr = profile ? qrs.find((q) => q.id === profile!.qr_code_id) : undefined

    if (!qr) {
      qr = qrs.find((q) => q.qr_number.toUpperCase() === clean.toUpperCase())
      if (qr) {
        profile = profiles.find((p) => p.qr_code_id === qr!.id)
      }
    }

    if (!qr) return { data: { ok: false, error: 'not_found' }, error: null }
    if (qr.status !== 'active') return { data: { ok: false, error: 'inactive' }, error: null }
    if (qr.usage_type !== 'personal' && qr.usage_type !== 'business_profile') {
      return { data: { ok: false, error: 'not_personal_profile', qr_number: qr.qr_number }, error: null }
    }
    if (!profile || !profile.is_published) {
      return { data: { ok: true, is_published: false, qr_number: qr.qr_number }, error: null }
    }

    const links = this.getLinks()
      .filter((l) => l.qr_profile_id === profile!.id && l.is_active)
      .sort((a, b) => a.display_order - b.display_order)

    const isBizProfile = qr.usage_type === 'business_profile'
    const profilePayload: Record<string, unknown> = {
      profile_type: isBizProfile ? 'business' : 'personal',
      profile_name: profile.profile_name,
      profile_image: profile.profile_image,
      avatar_id: profile.avatar_id ?? null,
      business_category: isBizProfile ? profile.business_category ?? null : null,
      location: isBizProfile ? profile.location ?? null : null,
      tagline: profile.tagline ?? null,
      bio: profile.bio,
      public_slug: profile.public_slug,
      theme: profile.theme,
    }

    if (isBizProfile) {
      const vis = profile.contact_visibility
      profilePayload.business_experience = profile.business_experience ?? null
      profilePayload.contact_person_name = vis?.contact_person !== false ? profile.contact_person_name ?? null : null
      profilePayload.contact_email = vis?.email !== false ? profile.contact_email ?? null : null
      profilePayload.contact_phone = vis?.phone !== false ? profile.contact_phone ?? null : null
      profilePayload.whatsapp_number = vis?.whatsapp !== false ? profile.whatsapp_number ?? null : null
      profilePayload.full_address = vis?.address !== false ? profile.full_address ?? null : null
      profilePayload.google_maps_url = vis?.maps !== false ? profile.google_maps_url ?? null : null
      profilePayload.working_hours = vis?.hours !== false ? profile.working_hours ?? null : null
    }

    return {
      data: {
        ok: true,
        is_published: true,
        qr_number: qr.qr_number,
        usage_type: qr.usage_type,
        profile: profilePayload,
        links,
      },
      error: null,
    }
  },

  getQrRedirect(params: { p_qr_number: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.qr_number.toUpperCase() === params.p_qr_number.trim().toUpperCase())
    if (!target) return { data: [], error: null }
    target.scan_count = (target.scan_count || 0) + 1
    this.saveQrs(qrs)
    const profile = this.getProfiles().find((p) => p.qr_code_id === target.id)
    return {
      data: [
        {
          status: target.status,
          destination_url: target.destination_url,
          is_claimed: Boolean(
            target.password_changed ||
              (target.destination_url && target.destination_url.trim().length > 0) ||
              target.usage_type,
          ),
          usage_type: target.usage_type ?? null,
          public_slug: profile?.public_slug ?? null,
          is_published: Boolean(profile?.is_published),
        },
      ],
      error: null,
    }
  },
}
