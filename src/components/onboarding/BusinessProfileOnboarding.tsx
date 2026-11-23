import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
} from 'lucide-react'
import { profilePublicUrl, qrPublicUrl } from '../../lib/config'
import { checkPublicSlugAvailable, saveBusinessProfile } from '../../lib/profileApi'
import {
  isValidProfileTheme,
  resolveBusinessTheme,
  toggleLightDarkVariant,
} from '../../lib/profileThemes'
import { downloadSingleQr, generateQrDataUrl } from '../../lib/qr'
import {
  BUSINESS_CATEGORY_OPTIONS,
  BUSINESS_LINK_TEMPLATES,
  compressBusinessLogo,
  getPlatformMeta,
  isValidContactEmail,
  isValidContactPhone,
  isValidDestinationUrl,
  isValidPublicSlug,
  normalizeDestinationUrl,
  normalizePublicSlug,
  SOCIAL_PLATFORMS,
  validatePlatformLinkUrl,
} from '../../lib/validation'
import type {
  ContactVisibility,
  CustomerDashboardData,
  ProfileTheme,
  PublicLinkItem,
  PublicProfileData,
  SocialPlatform,
} from '../../types'
import { Spinner } from '../Spinner'
import { CUSTOM_LINK_ICONS, PlatformIcon } from '../profile/PlatformIcons'
import { PublicProfileView } from '../profile/PublicProfileView'
import { ThemeTemplatePicker } from '../profile/ThemeTemplatePicker'
import { OnboardingLayout, type SaveStatus } from './OnboardingLayout'

interface BusinessProfileOnboardingProps {
  dashboard: CustomerDashboardData
  sessionToken: string
  onRefresh: () => Promise<void>
  onCompleteToEditor: () => void
  onSwitchMode?: () => void
  onLogout: () => void
}

interface CustomBusinessLinkDraft {
  id: string
  platform: SocialPlatform
  link_title: string
  destination_url: string
  icon: string | null
  is_active: boolean
}

const DEFAULT_VISIBILITY: ContactVisibility = {
  phone: true,
  whatsapp: true,
  email: true,
  address: true,
  maps: true,
  hours: true,
  contact_person: true,
}

const STEP_LABELS: Record<number, string> = {
  1: 'Brand & Story',
  2: 'Contact & Timings',
  3: 'Social & Business Links',
  4: 'Review & Publish',
  5: 'Published & Ready',
}

const TIMING_PRESETS = [
  'Mon–Sat: 10:00 AM – 7:00 PM',
  'Mon–Fri: 9:30 AM – 6:30 PM',
  'All Days: 10:00 AM – 9:00 PM',
  'Open 24 Hours',
]

const BUSINESS_SOCIAL_PLATFORMS = SOCIAL_PLATFORMS.filter(
  (p) =>
    p.id !== 'custom' &&
    p.id !== 'whatsapp' &&
    p.id !== 'google_reviews' &&
    p.id !== 'google_maps',
)

const ONBOARDING_BUSINESS_TEMPLATES = BUSINESS_LINK_TEMPLATES.filter(
  (t) => t.id !== 'google_maps',
)

function draftKey(qr: string) {
  return `spreadnfc_biz_onboarding_v2_${qr.toUpperCase()}`
}

export function BusinessProfileOnboarding({
  dashboard,
  sessionToken,
  onRefresh,
  onCompleteToEditor,
  onSwitchMode,
  onLogout,
}: BusinessProfileOnboardingProps) {
  const qrNumber = dashboard.qr.qr_number
  const dbProfile = dashboard.profile

  const savedDraft = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(draftKey(qrNumber))
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [qrNumber])

  const initialSocialPlatforms = useMemo<SocialPlatform[]>(() => {
    if (Array.isArray(savedDraft?.selectedPlatforms)) return savedDraft.selectedPlatforms
    const list: SocialPlatform[] = []
    for (const l of dashboard.links ?? []) {
      if (
        l.platform !== 'custom' &&
        l.platform !== 'google_reviews' &&
        l.platform !== 'google_maps' &&
        l.platform !== 'whatsapp' &&
        !list.includes(l.platform)
      ) {
        list.push(l.platform)
      }
    }
    return list
  }, [dashboard.links, savedDraft])

  const initialSocialValues = useMemo<Partial<Record<SocialPlatform, string>>>(() => {
    if (savedDraft?.socialValues) return savedDraft.socialValues
    const map: Partial<Record<SocialPlatform, string>> = {}
    for (const l of dashboard.links ?? []) {
      if (
        l.platform !== 'custom' &&
        l.platform !== 'google_reviews' &&
        l.platform !== 'google_maps' &&
        l.platform !== 'whatsapp'
      ) {
        if (!map[l.platform]) map[l.platform] = l.destination_url
      }
    }
    return map
  }, [dashboard.links, savedDraft])

  const initialBusinessLinks = useMemo<CustomBusinessLinkDraft[]>(() => {
    if (Array.isArray(savedDraft?.businessLinks)) return savedDraft.businessLinks
    return (dashboard.links ?? [])
      .filter((l) => l.platform === 'custom' || l.platform === 'google_reviews')
      .map((l) => ({
        id: l.id,
        platform: l.platform,
        link_title: l.link_title,
        destination_url: l.destination_url,
        icon: l.icon ?? null,
        is_active: l.is_active !== false,
      }))
  }, [dashboard.links, savedDraft])

  const [step, setStep] = useState<number>(() => {
    const raw = typeof savedDraft?.step === 'number' ? savedDraft.step : 1
    return Math.min(4, Math.max(1, raw))
  })
  const [businessCategory, setBusinessCategory] = useState<string>(
    savedDraft?.businessCategory ?? dbProfile?.business_category ?? 'Real Estate',
  )
  const [customCategory, setCustomCategory] = useState<string>(savedDraft?.customCategory ?? '')
  const [businessName, setBusinessName] = useState<string>(
    savedDraft?.businessName ?? dbProfile?.profile_name ?? dashboard.qr.business_name ?? '',
  )
  const [tagline, setTagline] = useState<string>(savedDraft?.tagline ?? dbProfile?.tagline ?? '')
  const [contactPersonName, setContactPersonName] = useState<string>(
    savedDraft?.contactPersonName ?? dbProfile?.contact_person_name ?? '',
  )
  const [profileImage, setProfileImage] = useState<string | null>(
    savedDraft?.profileImage !== undefined ? savedDraft.profileImage : dbProfile?.profile_image ?? null,
  )
  const [publicSlug, setPublicSlug] = useState<string>(savedDraft?.publicSlug ?? dbProfile?.public_slug ?? '')

  // About
  const [bio, setBio] = useState<string>(savedDraft?.bio ?? dbProfile?.bio ?? '')
  const [businessExperience, setBusinessExperience] = useState<string>(
    savedDraft?.businessExperience ?? dbProfile?.business_experience ?? '',
  )
  const [location, setLocation] = useState<string>(savedDraft?.location ?? dbProfile?.location ?? '')

  // Contact & Timings
  const [contactPhone, setContactPhone] = useState<string>(savedDraft?.contactPhone ?? dbProfile?.contact_phone ?? '')
  const [whatsappNumber, setWhatsappNumber] = useState<string>(
    savedDraft?.whatsappNumber ?? dbProfile?.whatsapp_number ?? '',
  )
  const [contactEmail, setContactEmail] = useState<string>(savedDraft?.contactEmail ?? dbProfile?.contact_email ?? '')
  const [fullAddress, setFullAddress] = useState<string>(savedDraft?.fullAddress ?? dbProfile?.full_address ?? '')
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>(
    savedDraft?.googleMapsUrl ?? dbProfile?.google_maps_url ?? '',
  )
  const [workingHours, setWorkingHours] = useState<string>(savedDraft?.workingHours ?? dbProfile?.working_hours ?? '')
  const [visibility, setVisibility] = useState<ContactVisibility>(
    savedDraft?.visibility ?? dbProfile?.contact_visibility ?? DEFAULT_VISIBILITY,
  )

  // Social & Business Links
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(initialSocialPlatforms)
  const [socialValues, setSocialValues] = useState<Partial<Record<SocialPlatform, string>>>(initialSocialValues)
  const [businessLinks, setBusinessLinks] = useState<CustomBusinessLinkDraft[]>(initialBusinessLinks)
  const [newLinkPlatform, setNewLinkPlatform] = useState<SocialPlatform>('google_reviews')
  const [newLinkTitle, setNewLinkTitle] = useState<string>(BUSINESS_LINK_TEMPLATES[0].defaultTitle)
  const [newLinkUrl, setNewLinkUrl] = useState<string>('')
  const [newLinkIcon, setNewLinkIcon] = useState<string>('link')
  const [newLinkPlaceholder, setNewLinkPlaceholder] = useState<string>(BUSINESS_LINK_TEMPLATES[0].placeholder)
  const [linkErr, setLinkErr] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const [theme, setTheme] = useState<ProfileTheme>(() => {
    if (savedDraft?.theme && isValidProfileTheme(savedDraft.theme)) return savedDraft.theme
    if (isValidProfileTheme(dbProfile?.theme)) return dbProfile.theme
    return 'biz_ivory'
  })

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const slugTimer = useRef<number | null>(null)
  const resolvedCategory =
    businessCategory === 'Other' && customCategory.trim() ? customCategory.trim() : businessCategory

  useEffect(() => {
    if (step >= 5) return
    try {
      sessionStorage.setItem(
        draftKey(qrNumber),
        JSON.stringify({
          step,
          businessCategory,
          customCategory,
          businessName,
          tagline,
          contactPersonName,
          profileImage,
          publicSlug,
          bio,
          businessExperience,
          location,
          selectedPlatforms,
          socialValues,
          businessLinks,
          contactPhone,
          whatsappNumber,
          contactEmail,
          fullAddress,
          googleMapsUrl,
          workingHours,
          visibility,
          theme,
        }),
      )
    } catch {
      // ignore storage errors
    }
  }, [
    qrNumber,
    step,
    businessCategory,
    customCategory,
    businessName,
    tagline,
    contactPersonName,
    profileImage,
    publicSlug,
    bio,
    businessExperience,
    location,
    selectedPlatforms,
    socialValues,
    businessLinks,
    contactPhone,
    whatsappNumber,
    contactEmail,
    fullAddress,
    googleMapsUrl,
    workingHours,
    visibility,
    theme,
  ])

  useEffect(() => {
    const clean = normalizePublicSlug(publicSlug)
    if (!clean) {
      setSlugStatus('idle')
      return
    }
    if (!isValidPublicSlug(clean)) {
      setSlugStatus('invalid')
      return
    }
    setSlugStatus('checking')
    if (slugTimer.current) window.clearTimeout(slugTimer.current)
    slugTimer.current = window.setTimeout(async () => {
      const res = await checkPublicSlugAvailable(sessionToken, clean)
      if (!res.checked) setSlugStatus('idle')
      else setSlugStatus(res.available ? 'available' : res.reason === 'invalid_slug' ? 'invalid' : 'taken')
    }, 350)
    return () => {
      if (slugTimer.current) window.clearTimeout(slugTimer.current)
    }
  }, [publicSlug, sessionToken])

  useEffect(() => {
    if (step !== 5) return
    let cancelled = false
    generateQrDataUrl(qrNumber).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [step, qrNumber])

  const goToStep = useCallback((nextStep: number) => {
    setError(null)
    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  function togglePlatform(id: SocialPlatform) {
    setSelectedPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
    setError(null)
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return
    setError(null)
    setUploadingLogo(true)
    try {
      const compressed = await compressBusinessLogo(file)
      setProfileImage(compressed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process logo image.')
    } finally {
      setUploadingLogo(false)
    }
  }

  function applyBusinessTemplate(tplId: string) {
    const tpl = ONBOARDING_BUSINESS_TEMPLATES.find((t) => t.id === tplId)
    if (!tpl) return
    setNewLinkPlatform(tpl.platform)
    setNewLinkTitle(tpl.defaultTitle)
    setNewLinkIcon(tpl.icon || 'link')
    setNewLinkPlaceholder(tpl.placeholder)
    setLinkErr(null)
  }

  function handleAddBusinessLink() {
    setLinkErr(null)
    const validation = validatePlatformLinkUrl(newLinkPlatform, newLinkUrl)
    if (!validation.ok) {
      setLinkErr(validation.error)
      return
    }
    const cleanTitle = newLinkTitle.trim() || getPlatformMeta(newLinkPlatform).defaultTitle
    if (cleanTitle.length > 80) {
      setLinkErr('Link title must be 80 characters or fewer.')
      return
    }
    const dup = businessLinks.some(
      (l) =>
        l.platform === newLinkPlatform &&
        l.destination_url.toLowerCase() === validation.normalizedUrl.toLowerCase(),
    )
    if (dup) {
      setLinkErr('You already added this exact link.')
      return
    }
    setBusinessLinks((prev) => [
      ...prev,
      {
        id: `biz-link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        platform: newLinkPlatform,
        link_title: cleanTitle,
        destination_url: validation.normalizedUrl,
        icon: newLinkPlatform === 'custom' ? newLinkIcon : null,
        is_active: true,
      },
    ])
    setNewLinkUrl('')
  }

  function moveBusinessLink(idx: number, delta: -1 | 1) {
    const nextIdx = idx + delta
    if (nextIdx < 0 || nextIdx >= businessLinks.length) return
    setBusinessLinks((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(idx, 1)
      copy.splice(nextIdx, 0, item)
      return copy
    })
  }

  function handleDropLink(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null)
      return
    }
    setBusinessLinks((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(dragIdx, 1)
      copy.splice(targetIdx, 0, moved)
      return copy
    })
    setDragIdx(null)
  }

  function buildCombinedLinks() {
    const out: Array<{
      platform: SocialPlatform
      link_title: string
      destination_url: string
      icon: string | null
      is_active: boolean
    }> = []
    const seen = new Set<string>()

    for (const pid of selectedPlatforms) {
      const raw = (socialValues[pid] || '').trim()
      if (!raw) continue
      const res = validatePlatformLinkUrl(pid, raw)
      if (!res.ok) continue
      const key = `${pid}|${res.normalizedUrl.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        platform: pid,
        link_title: getPlatformMeta(pid).defaultTitle,
        destination_url: res.normalizedUrl,
        icon: null,
        is_active: true,
      })
    }

    for (const l of businessLinks) {
      const key = `${l.platform}|${l.destination_url.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        platform: l.platform,
        link_title: l.link_title,
        destination_url: l.destination_url,
        icon: l.icon,
        is_active: l.is_active,
      })
    }

    return out
  }

  function validateStep2Contact(): boolean {
    setError(null)
    if (contactPhone.trim() && !isValidContactPhone(contactPhone)) {
      setError('Please enter a valid business phone number.')
      return false
    }
    if (whatsappNumber.trim() && !isValidContactPhone(whatsappNumber)) {
      setError('Please enter a valid WhatsApp number with country code.')
      return false
    }
    if (contactEmail.trim() && !isValidContactEmail(contactEmail)) {
      setError('Please enter a valid business email address.')
      return false
    }
    const cleanMaps = googleMapsUrl.trim() ? normalizeDestinationUrl(googleMapsUrl) : ''
    if (cleanMaps && !isValidDestinationUrl(cleanMaps)) {
      setError('Please enter a valid https:// Google Maps link.')
      return false
    }
    if (cleanMaps) setGoogleMapsUrl(cleanMaps)
    return true
  }

  function validateStep3Social(): boolean {
    for (const pid of selectedPlatforms) {
      const raw = (socialValues[pid] || '').trim()
      if (!raw) continue
      const res = validatePlatformLinkUrl(pid, raw)
      if (!res.ok) {
        setError(`${getPlatformMeta(pid).label}: ${res.error}`)
        return false
      }
    }
    return true
  }

  async function handlePublish() {
    if (!businessName.trim()) {
      setError('Business name is required.')
      goToStep(1)
      return
    }
    if (!validateStep2Contact()) {
      goToStep(2)
      return
    }
    if (slugStatus === 'taken' || slugStatus === 'invalid') {
      setError('Please choose an available custom URL handle or clear it.')
      return
    }

    const cleanMaps = googleMapsUrl.trim() ? normalizeDestinationUrl(googleMapsUrl) : null
    const cleanSlug = normalizePublicSlug(publicSlug) || null

    setSaving(true)
    setSaveStatus('saving')
    setError(null)

    const res = await saveBusinessProfile({
      sessionToken,
      qrNumber,
      previousSlug: dbProfile?.public_slug,
      businessName: businessName.trim(),
      businessCategory: resolvedCategory || null,
      location: location.trim() || null,
      tagline: tagline.trim() || null,
      bio: bio.trim() || null,
      profileImage,
      avatarId: null,
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
      contactPersonName: contactPersonName.trim() || null,
      businessExperience: businessExperience.trim() || null,
      whatsappNumber: whatsappNumber.trim() || null,
      fullAddress: fullAddress.trim() || null,
      workingHours: workingHours.trim() || null,
      googleMapsUrl: cleanMaps,
      contactVisibility: visibility,
      publicSlug: cleanSlug,
      theme,
      isPublished: true,
      links: buildCombinedLinks(),
    })

    setSaving(false)
    if (!res.ok) {
      setSaveStatus('error')
      setError(res.error || 'Could not publish your Business Profile.')
      return
    }

    setSaveStatus('saved')
    try {
      sessionStorage.removeItem(draftKey(qrNumber))
    } catch {
      // ignore
    }
    await onRefresh()
    goToStep(5)
  }

  const previewProfile: PublicProfileData = useMemo(
    () => ({
      profile_type: 'business',
      profile_name: businessName.trim() || 'Your Business Name',
      business_category: resolvedCategory || 'Business',
      location: location.trim() || null,
      business_experience: businessExperience.trim() || null,
      contact_person_name: visibility.contact_person ? contactPersonName.trim() || null : null,
      tagline: tagline.trim() || null,
      bio: bio.trim() || null,
      profile_image: profileImage,
      avatar_id: null,
      contact_email: visibility.email ? contactEmail.trim() || null : null,
      contact_phone: visibility.phone ? contactPhone.trim() || null : null,
      whatsapp_number: visibility.whatsapp ? whatsappNumber.trim() || null : null,
      full_address: visibility.address ? fullAddress.trim() || null : null,
      google_maps_url: visibility.maps && googleMapsUrl.trim() ? normalizeDestinationUrl(googleMapsUrl) : null,
      working_hours: visibility.hours ? workingHours.trim() || null : null,
      public_slug: normalizePublicSlug(publicSlug) || null,
      theme,
    }),
    [
      businessName,
      resolvedCategory,
      location,
      businessExperience,
      visibility,
      contactPersonName,
      tagline,
      bio,
      profileImage,
      contactEmail,
      contactPhone,
      whatsappNumber,
      fullAddress,
      googleMapsUrl,
      workingHours,
      publicSlug,
      theme,
    ],
  )

  const previewLinks: PublicLinkItem[] = useMemo(
    () =>
      buildCombinedLinks()
        .filter((l) => l.is_active)
        .map((l, idx) => ({
          id: `prev-${idx}`,
          platform: l.platform,
          link_title: l.link_title,
          destination_url: l.destination_url,
          icon: l.icon,
          display_order: idx,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPlatforms, socialValues, businessLinks],
  )

  const liveProfileUrl = profilePublicUrl(normalizePublicSlug(publicSlug) || qrNumber)
  const permanentQrUrl = qrPublicUrl(qrNumber)
  const brandInitials = (businessName.trim().slice(0, 2) || 'BN').toUpperCase()
  const showSplitPreview = step >= 1 && step <= 3

  return (
    <OnboardingLayout
      qrNumber={qrNumber}
      modeLabel="Business Profile"
      currentStep={Math.min(step, 4)}
      totalSteps={4}
      stepLabel={STEP_LABELS[step] ?? 'Business Setup'}
      saveStatus={saveStatus}
      wide={step <= 4}
      onBack={step > 1 && step < 5 ? () => goToStep(step - 1) : undefined}
      onSwitchMode={onSwitchMode}
      onLogout={onLogout}
    >
      {/* STEPS 1–3: TWO-COLUMN DESIGNER STUDIO + LIVE PREVIEW */}
      {showSplitPreview && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          <div className="lg:col-span-7 space-y-5">
            {/* STEP 1: BRAND & STORY */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-ink leading-tight">
                    Set Up Your{' '}
                    <span className="font-editorial italic font-normal text-[#171717]">
                      Business Identity
                    </span>
                  </h1>
                  <p className="mt-1.5 text-sm text-ink-secondary">
                    Add your brand name, logo, category, and a short introduction for customers.
                  </p>
                </div>

                {/* Card 1: Brand & Category */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-5">
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className={`relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border transition-colors ${
                        profileImage
                          ? 'border-[#E5E7EB] bg-white p-1.5'
                          : 'border-[#171717] bg-[#171717] text-white'
                      }`}
                    >
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt="Business logo"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-lg font-extrabold tracking-tight">{brandInitials}</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <label
                          className={`inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3.5 py-2 text-xs font-semibold text-ink transition-colors ${
                            uploadingLogo
                              ? 'opacity-60 cursor-wait'
                              : 'cursor-pointer hover:border-[#171717]'
                          }`}
                        >
                          {uploadingLogo ? (
                            <Spinner size={14} />
                          ) : (
                            <ImagePlus className="h-4 w-4 text-[#171717]" />
                          )}
                          <span>
                            {uploadingLogo
                              ? 'Processing Logo…'
                              : profileImage
                                ? 'Replace Logo'
                                : 'Upload Brand Logo'}
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={uploadingLogo}
                            className="hidden"
                            onChange={(e) => {
                              void handleLogoUpload(e.target.files?.[0] ?? null)
                              e.target.value = ''
                            }}
                          />
                        </label>
                        {profileImage && (
                          <button
                            type="button"
                            onClick={() => setProfileImage(null)}
                            className="text-xs font-medium text-rose-600 hover:underline"
                          >
                            Use Monogram
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted">
                        PNG, JPG, or WebP (transparency &amp; wide logos preserved). Without a logo, a monogram is shown.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <Building2 className="h-3.5 w-3.5 text-[#525252]" />
                      <span>Business Name *</span>
                    </label>
                    <input
                      value={businessName}
                      onChange={(e) => {
                        setBusinessName(e.target.value)
                        setError(null)
                      }}
                      maxLength={80}
                      placeholder="e.g. Elevate Realty"
                      className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-ink focus:border-[#171717] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-ink">Business Category</label>
                    <div className="flex flex-wrap gap-2">
                      {BUSINESS_CATEGORY_OPTIONS.map((cat) => {
                        const selected = businessCategory === cat.label
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setBusinessCategory(cat.label)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                              selected
                                ? 'border-[#171717] bg-[#171717] text-white shadow-xs'
                                : 'border-[#E5E7EB] bg-[#F7F7F5] text-ink-secondary hover:border-[#171717]/45 hover:text-ink'
                            }`}
                          >
                            {cat.label}
                          </button>
                        )
                      })}
                    </div>
                    {businessCategory === 'Other' && (
                      <input
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        maxLength={60}
                        placeholder="Specify category (e.g. Architecture Studio)"
                        className="mt-2 w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <MapPin className="h-3.5 w-3.5 text-ink-muted" />
                        <span>City / Area</span>
                      </label>
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        maxLength={80}
                        placeholder="e.g. Gomti Nagar, Lucknow"
                        className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <Award className="h-3.5 w-3.5 text-amber-600" />
                        <span>Experience / Badge</span>
                      </label>
                      <input
                        value={businessExperience}
                        onChange={(e) => setBusinessExperience(e.target.value)}
                        maxLength={60}
                        placeholder="e.g. 10+ Years Experience"
                        className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Tagline & About Story */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink">Tagline (Optional)</label>
                    <input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      maxLength={80}
                      placeholder="e.g. Premium Properties. Transparent Guidance."
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-semibold text-ink">About Your Business (Optional)</label>
                      <span className="font-mono text-[11px] text-ink-muted">{bio.length}/280</span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={280}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Briefly describe what your business offers and why customers choose you."
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink leading-relaxed focus:border-[#171717] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <User className="h-3.5 w-3.5 text-ink-muted" />
                      <span>Contact Person Name (Optional)</span>
                    </label>
                    <input
                      value={contactPersonName}
                      onChange={(e) => setContactPersonName(e.target.value)}
                      maxLength={80}
                      placeholder="e.g. Aditya Sharma"
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                    {error}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!businessName.trim()) {
                        setError('Please enter your Business Name to continue.')
                        return
                      }
                      goToStep(2)
                    }}
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#171717] px-6 text-sm font-bold text-white hover:bg-[#262626] shadow-md transition-colors"
                  >
                    <span>Continue to Contact &amp; Timings</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CONTACT & TIMINGS */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-ink leading-tight">
                    Contact &amp;{' '}
                    <span className="font-editorial italic font-normal text-[#171717]">
                      Business Timings
                    </span>
                  </h1>
                  <p className="mt-1.5 text-sm text-ink-secondary">
                    Add your working hours, phone, WhatsApp, and location—every field is optional and toggleable.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-4">
                  <div className="space-y-2.5 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] p-3.5">
                    <ContactFieldRow
                      icon={Clock}
                      label="Business Timings (Working Hours)"
                      value={workingHours}
                      onChange={setWorkingHours}
                      placeholder="Mon–Sat: 10:00 AM – 7:00 PM"
                      visible={visibility.hours}
                      onToggle={() => setVisibility((v) => ({ ...v, hours: !v.hours }))}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {TIMING_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setWorkingHours(preset)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            workingHours === preset
                              ? 'border-[#171717] bg-[#171717] text-white'
                              : 'border-[#E5E7EB] bg-white text-ink-secondary hover:border-[#171717]/45'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ContactFieldRow
                      icon={Phone}
                      label="Phone Number"
                      value={contactPhone}
                      onChange={setContactPhone}
                      placeholder="+91 98765 43210"
                      visible={visibility.phone}
                      onToggle={() => setVisibility((v) => ({ ...v, phone: !v.phone }))}
                    />
                    <ContactFieldRow
                      icon={MessageCircle}
                      label="WhatsApp Number"
                      value={whatsappNumber}
                      onChange={setWhatsappNumber}
                      placeholder="+91 98765 43210"
                      visible={visibility.whatsapp}
                      onToggle={() => setVisibility((v) => ({ ...v, whatsapp: !v.whatsapp }))}
                    />
                  </div>

                  <ContactFieldRow
                    icon={Mail}
                    label="Business Email"
                    value={contactEmail}
                    onChange={setContactEmail}
                    placeholder="hello@yourbusiness.com"
                    visible={visibility.email}
                    onToggle={() => setVisibility((v) => ({ ...v, email: !v.email }))}
                  />

                  <ContactFieldRow
                    icon={MapPin}
                    label="Full Business Address"
                    value={fullAddress}
                    onChange={setFullAddress}
                    placeholder="Suite 402, Gomti Nagar, Lucknow"
                    visible={visibility.address}
                    onToggle={() => setVisibility((v) => ({ ...v, address: !v.address }))}
                  />

                  <ContactFieldRow
                    icon={MapPin}
                    label="Google Maps Location URL"
                    value={googleMapsUrl}
                    onChange={setGoogleMapsUrl}
                    placeholder="https://maps.app.goo.gl/..."
                    visible={visibility.maps}
                    onToggle={() => setVisibility((v) => ({ ...v, maps: !v.maps }))}
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    Skip for now →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateStep2Contact()) return
                      goToStep(3)
                    }}
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#171717] px-6 text-sm font-bold text-white hover:bg-[#262626] shadow-md transition-colors"
                  >
                    <span>Continue to Links</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SOCIAL & BUSINESS LINKS (UNIFIED) */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-ink leading-tight">
                    Social &amp;{' '}
                    <span className="font-editorial italic font-normal text-[#171717]">
                      Business Links
                    </span>
                  </h1>
                  <p className="mt-1.5 text-sm text-ink-secondary">
                    Tap the channels you want to show, plus Google Reviews, digital menus, or custom URLs.
                  </p>
                </div>

                {/* Card A: Social Media Channels */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-ink">Social Media &amp; Website</h2>
                    <span className="text-[11px] text-ink-muted">
                      WhatsApp &amp; Maps are configured in Contact &amp; Timings
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_SOCIAL_PLATFORMS.map((p) => {
                      const active = selectedPlatforms.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePlatform(p.id)}
                          aria-pressed={active}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                            active
                              ? 'border-[#171717] bg-[#F7F7F5] text-[#171717] ring-1 ring-[#171717]'
                              : 'border-[#E5E7EB] bg-[#F7F7F5] text-ink-secondary hover:border-[#171717]/40 hover:text-ink'
                          }`}
                        >
                          <PlatformIcon platform={p.id} size={15} />
                          <span>{p.label}</span>
                          {active && <Check className="h-3 w-3 text-[#171717]" />}
                        </button>
                      )
                    })}
                  </div>

                  {selectedPlatforms.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-[#E5E7EB]">
                      {selectedPlatforms.map((pid) => {
                        const meta = getPlatformMeta(pid)
                        return (
                          <div key={pid} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                                <PlatformIcon platform={pid} size={15} />
                                <span>{meta.label}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePlatform(pid)}
                                className="text-[11px] font-medium text-rose-600 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                            <input
                              value={socialValues[pid] ?? ''}
                              onChange={(e) => {
                                setSocialValues((prev) => ({ ...prev, [pid]: e.target.value }))
                                setError(null)
                              }}
                              placeholder={meta.placeholder}
                              className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-xs font-mono text-ink focus:border-[#171717] focus:outline-none"
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Card B: Business & Custom Links */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-4">
                  <h2 className="text-sm font-bold text-ink">Google Reviews, Catalog &amp; Custom Links</h2>

                  <div className="flex flex-wrap gap-1.5">
                    {ONBOARDING_BUSINESS_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyBusinessTemplate(tpl.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          newLinkTitle === tpl.defaultTitle
                            ? 'border-[#171717] bg-[#171717] text-white'
                            : 'border-[#E5E7EB] bg-[#F7F7F5] text-ink-secondary hover:border-[#171717]/40'
                        }`}
                      >
                        <PlatformIcon platform={tpl.platform} customIcon={tpl.icon} size={14} />
                        <span>{tpl.label}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setNewLinkPlatform('custom')
                        setNewLinkTitle('')
                        setNewLinkIcon('link')
                        setNewLinkPlaceholder('https://example.com/your-link')
                        setLinkErr(null)
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-dashed border-[#171717]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#171717] hover:bg-[#F7F7F5]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Custom</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      maxLength={80}
                      placeholder="Button title"
                      className="rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-xs text-ink focus:border-[#171717] focus:outline-none"
                    />
                    <div className="sm:col-span-2 flex gap-2">
                      <input
                        value={newLinkUrl}
                        onChange={(e) => {
                          setNewLinkUrl(e.target.value)
                          setLinkErr(null)
                        }}
                        placeholder={newLinkPlaceholder}
                        className="flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-xs font-mono text-ink focus:border-[#171717] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddBusinessLink}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#171717] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#262626] shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {newLinkPlatform === 'custom' && (
                    <div className="flex flex-wrap gap-1.5">
                      {CUSTOM_LINK_ICONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setNewLinkIcon(opt.id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium ${
                            newLinkIcon === opt.id
                              ? 'border-[#171717] bg-[#F7F7F5] text-[#171717] font-semibold'
                              : 'border-[#E5E7EB] text-ink-muted'
                          }`}
                        >
                          <PlatformIcon platform="custom" customIcon={opt.id} size={13} />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {linkErr && <p className="text-xs font-medium text-rose-600">{linkErr}</p>}

                  {businessLinks.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                      {businessLinks.map((item, idx) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => setDragIdx(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropLink(idx)}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GripVertical className="h-4 w-4 text-ink-muted cursor-grab shrink-0" />
                            <PlatformIcon platform={item.platform} customIcon={item.icon} size={17} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-ink truncate">{item.link_title}</p>
                              <p className="text-[11px] font-mono text-ink-muted truncate">{item.destination_url}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveBusinessLink(idx, -1)}
                              disabled={idx === 0}
                              className="rounded-lg p-1 text-ink-muted hover:bg-white disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBusinessLink(idx, 1)}
                              disabled={idx === businessLinks.length - 1}
                              className="rounded-lg p-1 text-ink-muted hover:bg-white disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setBusinessLinks((prev) => prev.filter((l) => l.id !== item.id))}
                              className="rounded-lg p-1 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => goToStep(4)}
                    className="text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    Skip to Preview →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateStep3Social()) return
                      goToStep(4)
                    }}
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#171717] px-6 text-sm font-bold text-white hover:bg-[#262626] shadow-md transition-colors"
                  >
                    <span>Review &amp; Publish</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: STICKY LIVE PHONE PREVIEW (DESKTOP) */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-28">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-editorial space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink">Live Storefront Preview</span>
                <button
                  type="button"
                  onClick={() => setTheme(toggleLightDarkVariant(theme, 'business'))}
                  className="rounded-lg border border-[#E5E7EB] bg-[#F7F7F5] px-2.5 py-1 text-[11px] font-semibold text-[#171717] hover:border-[#171717]/40 transition-colors"
                >
                  {resolveBusinessTheme(theme).name}
                </button>
              </div>
              <div className="mx-auto max-w-[340px] rounded-[30px] border-[5px] border-[#171717] bg-[#171717] p-1 shadow-xl overflow-hidden">
                <div className="h-[540px] overflow-y-auto rounded-[24px]">
                  <PublicProfileView
                    profile={previewProfile}
                    links={previewLinks}
                    qrNumber={qrNumber}
                    previewMode
                    onThemeChange={setTheme}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW, CUSTOM HANDLE, THEME & PUBLISH */}
      {step === 4 && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-ink">
              Review &amp;{' '}
              <span className="font-editorial italic font-normal text-[#171717]">
                Publish Storefront
              </span>
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Choose a visual template and optional custom handle, then publish{' '}
              <span className="font-mono font-bold text-ink">{qrNumber}</span> live.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-editorial">
            <ThemeTemplatePicker
              mode="business"
              value={theme}
              onChange={setTheme}
            />
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-editorial space-y-2">
            <label className="block text-xs font-semibold text-ink">
              Custom Profile URL Handle (Optional)
            </label>
            <div className="flex items-center rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3.5 focus-within:border-[#171717]">
              <span className="text-xs font-mono text-ink-muted shrink-0">spreadnfc.in/p/</span>
              <input
                value={publicSlug}
                onChange={(e) => setPublicSlug(normalizePublicSlug(e.target.value))}
                placeholder="elevate-realty"
                className="w-full bg-transparent px-1 py-2.5 text-sm font-mono text-ink focus:outline-none"
              />
            </div>
            {slugStatus === 'checking' && <p className="text-xs text-ink-muted">Checking availability…</p>}
            {slugStatus === 'available' && <p className="text-xs text-emerald-700 font-medium">Handle available.</p>}
            {slugStatus === 'taken' && <p className="text-xs text-rose-600 font-medium">Already taken.</p>}
            {slugStatus === 'invalid' && (
              <p className="text-xs text-rose-600 font-medium">Use 3–40 lowercase letters, numbers, hyphens, or underscores.</p>
            )}
          </div>

          <div className="mx-auto max-w-[380px] rounded-[34px] border-[6px] border-[#171717] bg-[#171717] p-1 shadow-2xl overflow-hidden">
            <div className="h-[560px] overflow-y-auto rounded-[28px]">
              <PublicProfileView
                profile={previewProfile}
                links={previewLinks}
                qrNumber={qrNumber}
                previewMode
                onThemeChange={setTheme}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-center">
            <button
              type="button"
              disabled={saving}
              onClick={handlePublish}
              className="inline-flex h-12 min-w-[260px] items-center justify-center gap-2 rounded-xl bg-[#171717] px-7 text-sm font-bold text-white hover:bg-[#262626] shadow-lg transition-colors disabled:opacity-60"
            >
              {saving && <Spinner size={16} />}
              <span>{saving ? 'Publishing…' : 'Publish Business Profile'}</span>
              {!saving && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: PUBLISHED READY SCREEN */}
      {step === 5 && (
        <div className="mx-auto max-w-xl rounded-3xl border border-[#E5E7EB] bg-white p-6 sm:p-8 text-center space-y-6 shadow-editorial">
          <div className="space-y-2">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-ink">
              Your Business Storefront Is Live
            </h1>
            <p className="mx-auto max-w-md text-sm text-ink-secondary">
              Scanning QR <span className="font-mono font-bold text-ink">{qrNumber}</span> now opens your published Business Profile.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F5] p-4 space-y-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
              Public Profile URL
            </p>
            <p className="font-mono text-xs font-semibold text-ink break-all">{liveProfileUrl}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(liveProfileUrl)
                  setCopiedUrl(true)
                  setTimeout(() => setCopiedUrl(false), 1500)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:border-[#171717]/40"
              >
                {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
              </button>
              <a
                href={liveProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:border-[#171717]/40"
              >
                <span>Open Storefront</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href={permanentQrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626]"
              >
                <span>Test QR</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 border-t border-[#E5E7EB] pt-5">
            <div className="h-32 w-32 rounded-2xl border border-[#E5E7EB] bg-white p-2 flex items-center justify-center">
              {qrDataUrl ? <img src={qrDataUrl} alt={`QR ${qrNumber}`} className="h-full w-full object-contain" /> : <Spinner size={22} />}
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <p className="font-mono text-sm font-bold text-ink">{qrNumber}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => downloadSingleQr(qrNumber, 'png')}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-1.5 text-xs font-semibold text-ink hover:bg-white"
                >
                  <Download className="h-3.5 w-3.5" /> PNG
                </button>
                <button
                  type="button"
                  onClick={() => downloadSingleQr(qrNumber, 'svg')}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-1.5 text-xs font-semibold text-ink hover:bg-white"
                >
                  <Download className="h-3.5 w-3.5" /> SVG
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCompleteToEditor}
            className="inline-flex items-center gap-2 rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white hover:bg-[#262626] shadow-md transition-colors"
          >
            <Pencil className="h-4 w-4" />
            <span>Open Business Editor</span>
          </button>
        </div>
      )}
    </OnboardingLayout>
  )
}

function ContactFieldRow({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  onChange: (val: string) => void
  placeholder: string
  visible: boolean
  onToggle: () => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Icon className="h-3.5 w-3.5 text-[#525252]" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors ${
            visible
              ? 'border-[#171717]/20 bg-[#F3F4F6] text-[#171717]'
              : 'border-[#E5E7EB] bg-[#F7F7F5] text-ink-muted'
          }`}
        >
          {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          <span>{visible ? 'Public' : 'Hidden'}</span>
        </button>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none transition-colors"
      />
    </div>
  )
}
