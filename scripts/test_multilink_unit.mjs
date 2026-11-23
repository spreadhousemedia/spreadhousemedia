// ==============================================================================
// SPREADNFC MULTI-LINK SYSTEM: END-TO-END FLOW & SECURITY TEST SUITE
// Bundles src/lib/validation.ts + src/lib/mockDb.ts with esbuild and verifies
// all Personal, Business, Legacy, Mode-Lock, Privacy & Security invariants.
// ==============================================================================
import assert from 'node:assert/strict'
import { rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const storageMap = new Map()
globalThis.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear(),
}

const tmpDir = join(process.cwd(), '.tmp_test_build')
mkdirSync(tmpDir, { recursive: true })

try {
  await build({
    entryPoints: ['src/lib/validation.ts', 'src/lib/mockDb.ts', 'src/lib/avatars.ts'],
    outdir: tmpDir,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
  })

  const validation = await import(pathToFileURL(join(tmpDir, 'validation.js')).href)
  const { mockDb } = await import(pathToFileURL(join(tmpDir, 'mockDb.js')).href)
  const avatars = await import(pathToFileURL(join(tmpDir, 'avatars.js')).href)

  console.log('1. Testing URL, Platform Normalization & Slug Security Validation...')
  assert.equal(validation.isValidDestinationUrl('https://instagram.com/spreadnfc'), true)
  assert.equal(validation.isValidDestinationUrl('javascript:alert(1)'), false)
  assert.equal(validation.isValidDestinationUrl('data:text/html,<script>alert(1)</script>'), false)
  assert.equal(validation.isValidDestinationUrl('file:///etc/passwd'), false)
  assert.equal(validation.normalizeDestinationUrl('instagram.com/test'), 'https://instagram.com/test')
  assert.equal(validation.normalizeDestinationUrl('javascript:alert(1)'), 'javascript:alert(1)')
  assert.equal(validation.validatePlatformLinkUrl('instagram', 'https://evil.com/phish').ok, false)
  assert.equal(validation.validatePlatformLinkUrl('instagram', 'instagram.com/creator').ok, true)
  assert.equal(validation.validatePlatformLinkUrl('instagram', '@brijesh.dev').normalizedUrl, 'https://instagram.com/brijesh.dev')
  assert.equal(validation.validatePlatformLinkUrl('whatsapp', '+91 98765 43210').normalizedUrl, 'https://wa.me/919876543210')
  assert.equal(validation.validatePlatformLinkUrl('tiktok', 'creator').normalizedUrl, 'https://tiktok.com/@creator')
  assert.equal(validation.validatePlatformLinkUrl('youtube', '@spreadnfc').normalizedUrl, 'https://youtube.com/@spreadnfc')
  assert.equal(validation.validatePlatformLinkUrl('x', '@spread_nfc').normalizedUrl, 'https://x.com/spread_nfc')
  assert.equal(validation.validatePlatformLinkUrl('linkedin', 'brijesh-sharma').normalizedUrl, 'https://linkedin.com/in/brijesh-sharma')
  assert.equal(validation.validatePlatformLinkUrl('whatsapp', 'javascript:alert(1)').ok, false)
  assert.equal(validation.validatePlatformLinkUrl('custom', 'https://myshop.in/menu').ok, true)
  assert.equal(validation.isValidPublicSlug('admin'), false)
  assert.equal(validation.isValidPublicSlug('login'), false)
  assert.equal(validation.isValidPublicSlug('ab'), false)
  assert.equal(validation.isValidPublicSlug('brijesh_01'), true)

  console.log('1B. Testing Curated Avatar Library & Resolution...')
  assert.equal(avatars.CURATED_AVATARS.length, 18)
  assert.equal(avatars.isValidAvatarId('avatar-01'), true)
  assert.equal(avatars.isValidAvatarId('avatar-18'), true)
  assert.equal(avatars.isValidAvatarId('avatar-99'), false)
  assert.equal(avatars.resolveProfileAvatarSrc('avatar-07', null), '/avatars/avatar-07.webp')
  assert.equal(avatars.resolveProfileAvatarSrc(null, 'https://spreadnfc.in/avatars/avatar-12.webp'), '/avatars/avatar-12.webp')

  console.log('2. Testing Legacy Business QR Backward Compatibility (Z100)...')
  const legacyRedir = mockDb.getQrRedirect({ p_qr_number: 'Z100' })
  assert.equal(legacyRedir.data[0].status, 'active')
  assert.equal(legacyRedir.data[0].usage_type, 'business')
  assert.equal(legacyRedir.data[0].destination_url, 'https://example.com/menu')
  assert.equal(legacyRedir.data[0].is_claimed, true)
  const legacyProfileAttempt = mockDb.getPublicProfile({ p_identifier: 'Z100' })
  assert.equal(legacyProfileAttempt.data.ok, false)
  assert.equal(legacyProfileAttempt.data.error, 'not_personal_profile')

  console.log('3. Testing Personal Multi-Link QR Lifecycle, Mode Lock & Draft Privacy (Z103)...')
  const preClaim = mockDb.getQrRedirect({ p_qr_number: 'Z103' })
  assert.equal(preClaim.data[0].is_claimed, false)
  assert.equal(preClaim.data[0].usage_type, null)

  const badSetup = mockDb.verifySetupCode({ p_qr_number: 'Z103', p_setup_code: 'WRONG' })
  assert.equal(badSetup.data.ok, false)
  assert.equal(badSetup.data.error, 'wrong_setup_code')

  const claimRes = mockDb.claimQr({
    p_qr_number: 'Z103',
    p_setup_code: 'password',
    p_new_password: 'mynewpassword1',
    p_owner_email: 'alex@example.com',
  })
  assert.equal(claimRes.data.ok, true)
  const personalToken = claimRes.data.session_token
  assert.ok(personalToken)

  const modeSelect = mockDb.selectUsageMode({ p_session_token: personalToken, p_usage_type: 'personal' })
  assert.equal(modeSelect.data.ok, true)

  // Mode lock check: customer cannot switch to business
  const bypassMode = mockDb.selectUsageMode({ p_session_token: personalToken, p_usage_type: 'business' })
  assert.equal(bypassMode.data.ok, false)
  assert.equal(bypassMode.data.error, 'mode_locked')

  // Duplicate slug check (brijesh is already taken by Z102)
  assert.equal(
    mockDb.checkPublicSlugAvailable({ p_session_token: personalToken, p_slug: 'brijesh' }).data.available,
    false,
  )
  assert.equal(
    mockDb.checkPublicSlugAvailable({ p_session_token: personalToken, p_slug: 'alex-rivera' }).data.available,
    true,
  )
  const slugConflict = mockDb.savePersonalProfile({
    p_session_token: personalToken,
    p_profile_name: 'Alex',
    p_public_slug: 'brijesh',
    p_is_published: true,
    p_links: [],
  })
  assert.equal(slugConflict.data.ok, false)
  assert.equal(slugConflict.data.error, 'slug_taken')

  // Save unpublished draft -> must NOT expose links publicly
  const draftSave = mockDb.savePersonalProfile({
    p_session_token: personalToken,
    p_profile_name: 'Alex Rivera',
    p_avatar_id: 'avatar-07',
    p_tagline: 'Product Designer',
    p_bio: 'Creator',
    p_public_slug: 'alex-rivera',
    p_theme: 'dark',
    p_is_published: false,
    p_links: [
      { platform: 'instagram', link_title: 'Instagram', destination_url: 'https://instagram.com/alex', is_active: true },
      { platform: 'custom', link_title: 'Store', destination_url: 'https://alex.shop', icon: 'shopping-bag', is_active: true },
    ],
  })
  assert.equal(draftSave.data.ok, true)

  const draftPublic = mockDb.getPublicProfile({ p_identifier: 'alex-rivera' })
  assert.equal(draftPublic.data.ok, true)
  assert.equal(draftPublic.data.is_published, false)
  assert.equal(draftPublic.data.links, undefined)

  // Publish with 1 active and 1 disabled link -> only active link visible; both /p/slug and /p/Z103 resolve!
  const publishSave = mockDb.savePersonalProfile({
    p_session_token: personalToken,
    p_profile_name: 'Alex Rivera',
    p_avatar_id: 'avatar-07',
    p_tagline: 'Product Designer',
    p_bio: 'Creator',
    p_public_slug: 'alex-rivera',
    p_theme: 'dark',
    p_is_published: true,
    p_links: [
      { platform: 'youtube', link_title: 'YouTube', destination_url: 'https://youtube.com/@alex', is_active: true },
      { platform: 'instagram', link_title: 'Instagram', destination_url: 'https://instagram.com/alex', is_active: false },
      { platform: 'custom', link_title: 'Portfolio', destination_url: 'https://alex.design', icon: 'briefcase', is_active: true },
    ],
  })
  assert.equal(publishSave.data.ok, true)

  const pubBySlug = mockDb.getPublicProfile({ p_identifier: 'alex-rivera' })
  assert.equal(pubBySlug.data.is_published, true)
  assert.equal(pubBySlug.data.profile.theme, 'dark')
  assert.equal(pubBySlug.data.profile.avatar_id, 'avatar-07')
  assert.equal(pubBySlug.data.profile.tagline, 'Product Designer')
  assert.equal(pubBySlug.data.profile.contact_email, undefined)
  assert.equal(pubBySlug.data.links.length, 2)
  assert.equal(pubBySlug.data.links[0].link_title, 'YouTube')
  assert.equal(pubBySlug.data.links[1].link_title, 'Portfolio')

  const pubByQr = mockDb.getPublicProfile({ p_identifier: 'Z103' })
  assert.equal(pubByQr.data.is_published, true)
  assert.equal(pubByQr.data.links.length, 2)

  // Duplicate link check
  const dupLink = mockDb.savePersonalProfile({
    p_session_token: personalToken,
    p_profile_name: 'Alex Rivera',
    p_is_published: true,
    p_links: [
      { platform: 'instagram', link_title: 'IG 1', destination_url: 'https://instagram.com/alex', is_active: true },
      { platform: 'instagram', link_title: 'IG 2', destination_url: 'https://instagram.com/alex', is_active: true },
    ],
  })
  assert.equal(dupLink.data.ok, false)
  assert.equal(dupLink.data.error, 'duplicate_link')

  // Password change keeps QR working
  const pwdChange = mockDb.customerChangePassword({
    p_session_token: personalToken,
    p_current_password: 'mynewpassword1',
    p_new_password: 'updatedpassword2',
  })
  assert.equal(pwdChange.data.ok, true)
  assert.equal(mockDb.loginQr({ p_qr_number: 'Z103', p_password: 'mynewpassword1' }).data.ok, false)
  assert.equal(mockDb.loginQr({ p_qr_number: 'Z103', p_password: 'updatedpassword2' }).data.ok, true)

  console.log('4. Testing Business Direct Redirection & Google Reviews Workflow (BIZ-900)...')
  const createBiz = mockDb.createSingleQr({
    p_qr_number: 'BIZ-900',
    p_qr_name: 'Cafe Table Standee',
    p_password: 'TF-BIZ1',
  })
  assert.equal(createBiz.data.ok, true)

  const bizClaim = mockDb.claimQr({
    p_qr_number: 'BIZ-900',
    p_setup_code: 'TF-BIZ1',
    p_new_password: 'ownerpass99',
  })
  assert.equal(bizClaim.data.ok, true)
  const bizToken = bizClaim.data.session_token

  assert.equal(mockDb.selectUsageMode({ p_session_token: bizToken, p_usage_type: 'business' }).data.ok, true)
  assert.equal(mockDb.selectUsageMode({ p_session_token: bizToken, p_usage_type: 'personal' }).data.error, 'mode_locked')

  const saveGoogleReview = mockDb.saveBusinessSettings({
    p_session_token: bizToken,
    p_business_name: 'Spread Cafe',
    p_business_purpose: 'google_reviews',
    p_destination_url: 'https://g.page/r/spread-cafe/review',
  })
  assert.equal(saveGoogleReview.data.ok, true)

  const bizRedir = mockDb.getQrRedirect({ p_qr_number: 'BIZ-900' })
  assert.equal(bizRedir.data[0].usage_type, 'business')
  assert.equal(bizRedir.data[0].destination_url, 'https://g.page/r/spread-cafe/review')

  // Update Business URL -> immediately reflected
  mockDb.saveBusinessSettings({
    p_session_token: bizToken,
    p_business_name: 'Spread Cafe',
    p_business_purpose: 'website',
    p_destination_url: 'https://spreadcafe.in',
  })
  assert.equal(mockDb.getQrRedirect({ p_qr_number: 'BIZ-900' }).data[0].destination_url, 'https://spreadcafe.in')

  console.log('5. Testing Admin Mode Switch Preserving Data...')
  const bizQrRecord = mockDb.getQrs().find((q) => q.qr_number === 'BIZ-900')
  assert.equal(mockDb.adminSetUsageType({ p_qr_id: bizQrRecord.id, p_usage_type: 'personal' }).data.ok, true)
  assert.equal(mockDb.getQrs().find((q) => q.qr_number === 'BIZ-900').destination_url, 'https://spreadcafe.in')

  console.log('6. Testing Google Reviews / Maps Validation & Private Host SSRF Blocking...')
  assert.equal(validation.validatePlatformLinkUrl('google_reviews', 'https://g.page/r/elevate/review').ok, true)
  assert.equal(validation.validatePlatformLinkUrl('google_reviews', 'https://evil.com/phish').ok, false)
  assert.equal(validation.validatePlatformLinkUrl('google_maps', 'https://maps.app.goo.gl/xyz123').ok, true)
  assert.equal(validation.validatePlatformLinkUrl('custom', 'http://127.0.0.1:8080/admin').ok, false)
  assert.equal(validation.validatePlatformLinkUrl('custom', 'http://172.16.0.10/internal').ok, false)
  assert.equal(validation.validatePlatformLinkUrl('custom', 'http://169.254.169.254/latest/meta-data').ok, false)

  console.log('7. Testing Business Profile (B2) Lifecycle, Mode Lock & Draft Privacy (BP-200)...')
  assert.equal(
    mockDb.createSingleQr({
      p_qr_number: 'BP-200',
      p_qr_name: 'Elevate Realty Card',
      p_password: 'TF-BP20',
    }).data.ok,
    true,
  )
  const bpClaim = mockDb.claimQr({
    p_qr_number: 'BP-200',
    p_setup_code: 'TF-BP20',
    p_new_password: 'realtypass1',
  })
  assert.equal(bpClaim.data.ok, true)
  const bpToken = bpClaim.data.session_token

  assert.equal(mockDb.selectUsageMode({ p_session_token: bpToken, p_usage_type: 'business_profile' }).data.ok, true)
  // Mode lock check: cannot switch to personal or business direct link
  assert.equal(mockDb.selectUsageMode({ p_session_token: bpToken, p_usage_type: 'business' }).data.error, 'mode_locked')
  assert.equal(mockDb.selectUsageMode({ p_session_token: bpToken, p_usage_type: 'personal' }).data.error, 'mode_locked')

  // Reject invalid email or phone
  assert.equal(
    mockDb.saveBusinessProfile({
      p_session_token: bpToken,
      p_business_name: 'Elevate Realty',
      p_contact_email: 'not-an-email',
      p_links: [],
    }).data.error,
    'invalid_contact_email',
  )

  // Save draft Business Profile -> must NOT leak links publicly
  const bpDraft = mockDb.saveBusinessProfile({
    p_session_token: bpToken,
    p_business_name: 'Elevate Realty',
    p_business_category: 'Real Estate',
    p_location: 'Lucknow',
    p_tagline: 'Premium properties. Trusted guidance.',
    p_bio: 'Residential and commercial advisory.',
    p_contact_email: 'hello@elevaterealty.in',
    p_contact_phone: '+91 98765 43210',
    p_public_slug: 'elevate-realty',
    p_theme: 'light',
    p_is_published: false,
    p_links: [
      { platform: 'google_reviews', link_title: 'Google Reviews', destination_url: 'https://g.page/r/elevate/review', is_active: true },
    ],
  })
  assert.equal(bpDraft.data.ok, true)
  const bpDraftPub = mockDb.getPublicProfile({ p_identifier: 'elevate-realty' })
  assert.equal(bpDraftPub.data.is_published, false)
  assert.equal(bpDraftPub.data.links, undefined)

  // Publish Business Profile -> resolves by slug and QR number, returns business fields + links in order
  // Also tests contact_visibility privacy toggle (email hidden while phone/whatsapp/address/maps/hours remain public)
  const bpPublish = mockDb.saveBusinessProfile({
    p_session_token: bpToken,
    p_business_name: 'Elevate Realty',
    p_business_category: 'Real Estate',
    p_location: 'Lucknow',
    p_tagline: 'Premium properties. Trusted guidance.',
    p_bio: 'Residential and commercial advisory.',
    p_contact_person_name: 'Aditya Sharma',
    p_business_experience: '10+ Years',
    p_contact_email: 'private@elevaterealty.in',
    p_contact_phone: '+91 98765 43210',
    p_whatsapp_number: '+91 98765 43210',
    p_full_address: 'Gomti Nagar, Lucknow',
    p_working_hours: 'Mon-Sat 10AM-7PM',
    p_google_maps_url: 'https://maps.app.goo.gl/elevate',
    p_contact_visibility: {
      phone: true,
      whatsapp: true,
      email: false,
      address: true,
      maps: true,
      hours: true,
      contact_person: true,
    },
    p_public_slug: 'elevate-realty',
    p_theme: 'dark',
    p_is_published: true,
    p_links: [
      { platform: 'google_reviews', link_title: 'Leave a Google Review', destination_url: 'https://g.page/r/elevate/review', is_active: true },
      { platform: 'google_maps', link_title: 'Visit Our Office', destination_url: 'https://maps.app.goo.gl/elevate', is_active: true },
      { platform: 'whatsapp', link_title: 'WhatsApp Us', destination_url: 'https://wa.me/919876543210', is_active: true },
    ],
  })
  assert.equal(bpPublish.data.ok, true)

  const bpPublic = mockDb.getPublicProfile({ p_identifier: 'elevate-realty' })
  assert.equal(bpPublic.data.ok, true)
  assert.equal(bpPublic.data.is_published, true)
  assert.equal(bpPublic.data.profile.profile_type, 'business')
  assert.equal(bpPublic.data.profile.business_category, 'Real Estate')
  assert.equal(bpPublic.data.profile.location, 'Lucknow')
  assert.equal(bpPublic.data.profile.business_experience, '10+ Years')
  assert.equal(bpPublic.data.profile.contact_person_name, 'Aditya Sharma')
  assert.equal(bpPublic.data.profile.contact_email, null)
  assert.equal(bpPublic.data.profile.contact_phone, '+91 98765 43210')
  assert.equal(bpPublic.data.profile.whatsapp_number, '+91 98765 43210')
  assert.equal(bpPublic.data.profile.full_address, 'Gomti Nagar, Lucknow')
  assert.equal(bpPublic.data.links.length, 3)
  assert.equal(validation.BUSINESS_CATEGORY_OPTIONS.length, 10)
  assert.equal(validation.BUSINESS_LINK_TEMPLATES.length, 10)

  const bpRedirect = mockDb.getQrRedirect({ p_qr_number: 'BP-200' })
  assert.equal(bpRedirect.data[0].usage_type, 'business_profile')
  assert.equal(bpRedirect.data[0].public_slug, 'elevate-realty')

  console.log('8. Testing Multi-QR Secure Summary & Forged Token Rejection...')
  const multiSummary = mockDb.getMultiQrSummary({
    p_session_tokens: [personalToken, bpToken, 'forged-invalid-token-123'],
  })
  assert.equal(multiSummary.data.ok, true)
  assert.equal(multiSummary.data.items.length, 2)
  assert.equal(multiSummary.data.items.some((i) => i.qr_number === 'Z103'), true)
  assert.equal(multiSummary.data.items.some((i) => i.qr_number === 'BP-200'), true)

  console.log('9. Testing Self-Service Profile Mode Switch & Funky Personal Themes...')
  const swToPersonal = mockDb.switchUsageMode({ p_session_token: bpToken, p_usage_type: 'personal' })
  assert.equal(swToPersonal.data.ok, true)
  assert.equal(swToPersonal.data.usage_type, 'personal')
  const bpAfterPersonal = mockDb.getCustomerDashboard({ p_session_token: bpToken })
  assert.equal(bpAfterPersonal.data.qr.usage_type, 'personal')
  assert.equal(bpAfterPersonal.data.profile.profile_type, 'personal')
  assert.equal(bpAfterPersonal.data.links.length, 3)

  const swToDirect = mockDb.switchUsageMode({ p_session_token: bpToken, p_usage_type: 'business' })
  assert.equal(swToDirect.data.ok, true)
  assert.equal(mockDb.getCustomerDashboard({ p_session_token: bpToken }).data.qr.usage_type, 'business')

  const swBackBiz = mockDb.switchUsageMode({ p_session_token: bpToken, p_usage_type: 'business_profile' })
  assert.equal(swBackBiz.data.ok, true)
  assert.equal(mockDb.getCustomerDashboard({ p_session_token: bpToken }).data.links.length, 3)

  const funkySave = mockDb.savePersonalProfile({
    p_session_token: personalToken,
    p_profile_name: 'Aarav Creator',
    p_theme: 'per_pop_yellow',
    p_is_published: true,
    p_links: [
      { platform: 'instagram', link_title: 'Instagram', destination_url: 'https://instagram.com/aarav', is_active: true },
    ],
  })
  assert.equal(funkySave.data.ok, true)
  assert.equal(mockDb.getPublicProfile({ p_identifier: 'Z103' }).data.profile.theme, 'per_pop_yellow')

  console.log('\n✅ ALL MULTI-LINK & SECURITY VERIFICATION TESTS PASSED!')
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
}
