import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Layers,
  Link2,
  Lock,
  Pencil,
  Plus,
  QrCode,
  Save,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import { profilePublicUrl } from '../../lib/config'
import { saveBusinessProfile } from '../../lib/profileApi'
import { isValidProfileTheme } from '../../lib/profileThemes'
import { downloadSingleQr, generateQrDataUrl } from '../../lib/qr'
import {
  BUSINESS_CATEGORIES,
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
  QrLink,
  SocialPlatform,
  UsageType,
} from '../../types'
import { Spinner } from '../Spinner'
import { CUSTOM_LINK_ICONS, PlatformIcon } from '../profile/PlatformIcons'
import { PublicProfileView } from '../profile/PublicProfileView'
import { ThemeTemplatePicker } from '../profile/ThemeTemplatePicker'
import { CustomerAccountSettings } from './CustomerAccountSettings'

interface BusinessProfileDashboardProps {
  dashboard: CustomerDashboardData
  sessionToken: string
  multiQrCount?: number
  onOpenMultiQr?: () => void
  onRefresh: () => Promise<void>
  onSwitchMode?: () => void
  onModeSwitched?: (nextMode?: UsageType | 'reset') => Promise<void>
  onLogout: () => void
}

type EditorSection = 'profile' | 'contact' | 'links' | 'account'

type DraftLink = {
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

const SECTIONS: Array<{ id: EditorSection; label: string }> = [
  { id: 'profile', label: 'Brand & Profile' },
  { id: 'contact', label: 'Contact & Hours' },
  { id: 'links', label: 'Links & Social' },
  { id: 'account', label: 'Share, QR & Security' },
]

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

const EDITOR_BUSINESS_TEMPLATES = BUSINESS_LINK_TEMPLATES.filter(
  (t) => t.id !== 'google_maps',
)

export function BusinessProfileDashboard({
  dashboard,
  sessionToken,
  multiQrCount = 1,
  onOpenMultiQr,
  onRefresh,
  onSwitchMode,
  onModeSwitched,
  onLogout,
}: BusinessProfileDashboardProps) {
  const qrNumber = dashboard.qr.qr_number

  const [section, setSection] = useState<EditorSection>('profile')
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')

  // Profile fields
  const [businessName, setBusinessName] = useState(
    dashboard.profile?.profile_name || dashboard.qr.business_name || '',
  )
  const [businessCategory, setBusinessCategory] = useState(
    dashboard.profile?.business_category || BUSINESS_CATEGORIES[0],
  )
  const [location, setLocation] = useState(dashboard.profile?.location || '')
  const [tagline, setTagline] = useState(dashboard.profile?.tagline || '')
  const [contactPersonName, setContactPersonName] = useState(
    dashboard.profile?.contact_person_name || '',
  )
  const [businessExperience, setBusinessExperience] = useState(
    dashboard.profile?.business_experience || '',
  )
  const [bio, setBio] = useState(dashboard.profile?.bio || '')
  const [contactEmail, setContactEmail] = useState(dashboard.profile?.contact_email || '')
  const [contactPhone, setContactPhone] = useState(dashboard.profile?.contact_phone || '')
  const [whatsappNumber, setWhatsappNumber] = useState(dashboard.profile?.whatsapp_number || '')
  const [fullAddress, setFullAddress] = useState(dashboard.profile?.full_address || '')
  const [workingHours, setWorkingHours] = useState(dashboard.profile?.working_hours || '')
  const [googleMapsUrl, setGoogleMapsUrl] = useState(dashboard.profile?.google_maps_url || '')
  const [visibility, setVisibility] = useState<ContactVisibility>(
    dashboard.profile?.contact_visibility ?? DEFAULT_VISIBILITY,
  )
  const [publicSlug, setPublicSlug] = useState(dashboard.profile?.public_slug || '')
  const [theme, setTheme] = useState<ProfileTheme>(
    isValidProfileTheme(dashboard.profile?.theme) ? dashboard.profile.theme : 'biz_ivory',
  )
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [isPublished, setIsPublished] = useState<boolean>(
    dashboard.profile?.is_published ?? false,
  )
  const [profileImage, setProfileImage] = useState<string | null>(
    dashboard.profile?.profile_image || null,
  )

  const [links, setLinks] = useState<DraftLink[]>(
    (dashboard.links ?? []).map((l: QrLink) => ({
      id: l.id,
      platform: l.platform,
      link_title: l.link_title,
      destination_url: l.destination_url,
      icon: l.icon ?? null,
      is_active: l.is_active !== false,
    })),
  )

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // Modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [draftPlatform, setDraftPlatform] = useState<SocialPlatform>('instagram')
  const [draftTitle, setDraftTitle] = useState('Instagram')
  const [draftUrl, setDraftUrl] = useState('')
  const [draftIcon, setDraftIcon] = useState<string>('link')
  const [draftActive, setDraftActive] = useState(true)
  const [linkError, setLinkError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (section !== 'account') return
    let cancelled = false
    generateQrDataUrl(qrNumber).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [section, qrNumber])

  const markDirty = () => {
    setHasUnsavedChanges(true)
    setSaveSuccess(null)
  }

  const activeIdentifier = publicSlug.trim() ? normalizePublicSlug(publicSlug) : qrNumber
  const publicShareUrl = profilePublicUrl(activeIdentifier)
  const brandInitials = (businessName.trim().slice(0, 2) || 'BN').toUpperCase()

  const socialLinks = links.filter(
    (l) => l.platform !== 'custom' && l.platform !== 'google_reviews' && l.platform !== 'google_maps',
  )
  const businessAndCustomLinks = links.filter(
    (l) => l.platform === 'custom' || l.platform === 'google_reviews' || l.platform === 'google_maps',
  )

  function openNewLinkModal(platform: SocialPlatform, presetTitle?: string, presetIcon?: string | null) {
    setEditingLinkId(null)
    setDraftPlatform(platform)
    setDraftTitle(presetTitle ?? getPlatformMeta(platform).defaultTitle)
    setDraftUrl('')
    setDraftIcon(presetIcon || 'link')
    setDraftActive(true)
    setLinkError(null)
    setLinkModalOpen(true)
  }

  function openEditLinkModal(link: DraftLink) {
    setEditingLinkId(link.id)
    setDraftPlatform(link.platform)
    setDraftTitle(link.link_title)
    setDraftUrl(link.destination_url)
    setDraftIcon(link.icon || 'link')
    setDraftActive(link.is_active)
    setLinkError(null)
    setLinkModalOpen(true)
  }

  function handleSaveLinkModal() {
    setLinkError(null)
    const cleanTitle = draftTitle.trim() || getPlatformMeta(draftPlatform).defaultTitle
    if (cleanTitle.length > 80) {
      setLinkError('Title must be 80 characters or fewer.')
      return
    }
    const validation = validatePlatformLinkUrl(draftPlatform, draftUrl)
    if (!validation.ok) {
      setLinkError(validation.error)
      return
    }
    const dup = links.some(
      (l) =>
        l.id !== editingLinkId &&
        l.platform === draftPlatform &&
        l.destination_url.toLowerCase() === validation.normalizedUrl.toLowerCase(),
    )
    if (dup) {
      setLinkError('This exact link already exists on your profile.')
      return
    }

    if (editingLinkId) {
      setLinks((prev) =>
        prev.map((l) =>
          l.id === editingLinkId
            ? {
                ...l,
                platform: draftPlatform,
                link_title: cleanTitle,
                destination_url: validation.normalizedUrl,
                icon: draftPlatform === 'custom' ? draftIcon : null,
                is_active: draftActive,
              }
            : l,
        ),
      )
    } else {
      setLinks((prev) => [
        ...prev,
        {
          id: `biz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          platform: draftPlatform,
          link_title: cleanTitle,
          destination_url: validation.normalizedUrl,
          icon: draftPlatform === 'custom' ? draftIcon : null,
          is_active: draftActive,
        },
      ])
    }

    markDirty()
    setLinkModalOpen(false)
  }

  function moveLinkById(id: string, delta: -1 | 1) {
    const idx = links.findIndex((l) => l.id === id)
    if (idx === -1) return
    const nextIdx = idx + delta
    if (nextIdx < 0 || nextIdx >= links.length) return
    setLinks((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(idx, 1)
      copy.splice(nextIdx, 0, moved)
      return copy
    })
    markDirty()
  }

  function handleDropById(targetId: string) {
    if (dragIndex === null) return
    const targetIdx = links.findIndex((l) => l.id === targetId)
    if (targetIdx === -1 || dragIndex === targetIdx) {
      setDragIndex(null)
      return
    }
    setLinks((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(dragIndex, 1)
      copy.splice(targetIdx, 0, moved)
      return copy
    })
    setDragIndex(null)
    markDirty()
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return
    setSaveError(null)
    setUploadingLogo(true)
    try {
      const compressed = await compressBusinessLogo(file)
      setProfileImage(compressed)
      markDirty()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not process image.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSaveAll(publishOverride?: boolean) {
    setSaveError(null)
    setSaveSuccess(null)

    if (!businessName.trim() || businessName.trim().length > 80) {
      setSaveError('Business name is required (1–80 characters).')
      return
    }
    if (contactEmail.trim() && !isValidContactEmail(contactEmail)) {
      setSaveError('Please enter a valid contact email.')
      return
    }
    if (contactPhone.trim() && !isValidContactPhone(contactPhone)) {
      setSaveError('Please enter a valid contact phone number.')
      return
    }
    if (whatsappNumber.trim() && !isValidContactPhone(whatsappNumber)) {
      setSaveError('Please enter a valid WhatsApp number.')
      return
    }
    const cleanMaps = googleMapsUrl.trim() ? normalizeDestinationUrl(googleMapsUrl) : null
    if (cleanMaps && !isValidDestinationUrl(cleanMaps)) {
      setSaveError('Please enter a valid https:// Google Maps URL.')
      return
    }
    const cleanSlug = normalizePublicSlug(publicSlug)
    if (cleanSlug && !isValidPublicSlug(cleanSlug)) {
      setSaveError('Custom URL slug must be 3–40 lowercase letters, numbers, hyphens, or underscores.')
      return
    }

    const nextPublished = publishOverride !== undefined ? publishOverride : isPublished

    setSaving(true)
    const res = await saveBusinessProfile({
      sessionToken,
      qrNumber,
      previousSlug: dashboard.profile?.public_slug,
      businessName: businessName.trim(),
      businessCategory: businessCategory.trim() || null,
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
      publicSlug: cleanSlug || null,
      theme,
      isPublished: nextPublished,
      links: links.map((l) => ({
        platform: l.platform,
        link_title: l.link_title,
        destination_url: l.destination_url,
        icon: l.icon,
        is_active: l.is_active,
      })),
    })
    setSaving(false)

    if (!res.ok) {
      setSaveError(res.error || 'Failed to save Business Profile.')
      return
    }

    setIsPublished(nextPublished)
    setHasUnsavedChanges(false)
    setSaveSuccess('Your business storefront has been updated.')
    await onRefresh()
  }

  const previewProfile: PublicProfileData = useMemo(
    () => ({
      profile_type: 'business',
      profile_name: businessName.trim() || 'Your Business Name',
      business_category: businessCategory.trim() || null,
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
      businessCategory,
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
      links
        .filter((l) => l.is_active)
        .map((l, idx) => ({
          id: l.id,
          platform: l.platform,
          link_title: l.link_title,
          destination_url: l.destination_url,
          icon: l.icon,
          display_order: idx,
        })),
    [links],
  )

  const selectableModalPlatforms = SOCIAL_PLATFORMS.filter(
    (p) => p.id !== 'whatsapp' || draftPlatform === 'whatsapp',
  )

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 relative z-10 pb-20">
      {/* Slim Studio Header Bar */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5 shadow-editorial flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`relative flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${
              profileImage
                ? 'border-[#E5E7EB] bg-white p-1'
                : 'border-[#171717] bg-[#171717] text-white'
            }`}
          >
            {profileImage ? (
              <img src={profileImage} alt="Business logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm font-extrabold tracking-tight">{brandInitials}</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-base text-ink">{businessName || qrNumber}</span>
              <span className="rounded-md bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#171717]">
                {qrNumber}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>Business Profile</span>
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                  isPublished
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              Storefront:{' '}
              <a
                href={publicShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-medium text-[#171717] hover:underline"
              >
                {publicShareUrl}
              </a>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSwitchMode && (
            <button
              type="button"
              onClick={onSwitchMode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-2 text-xs font-semibold text-ink hover:border-[#171717]/50 transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Switch Mode</span>
            </button>
          )}
          <a
            href={publicShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-2 text-xs font-semibold text-ink hover:border-[#171717]/50 transition-colors"
          >
            <span>View Live</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {onOpenMultiQr && (
            <button
              type="button"
              onClick={onOpenMultiQr}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-2 text-xs font-bold text-[#171717] hover:border-[#171717]/40 transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-[#171717]" />
              <span>Multi-QR{multiQrCount > 1 ? ` (${multiQrCount})` : ''}</span>
            </button>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveAll(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#171717] px-4 py-2 text-xs font-bold text-white hover:bg-[#262626] shadow-xs disabled:opacity-60 transition-colors"
          >
            {saving ? <Spinner size={13} /> : <Save className="h-3.5 w-3.5" />}
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile Edit / Preview Tabs */}
      <div className="flex lg:hidden items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-[#E5E7EB] bg-white p-1 w-full">
          <button
            type="button"
            onClick={() => setMobileView('edit')}
            className={`flex-1 rounded-lg py-2 text-xs font-bold ${
              mobileView === 'edit' ? 'bg-[#171717] text-white' : 'text-ink-muted'
            }`}
          >
            Edit Sections
          </button>
          <button
            type="button"
            onClick={() => setMobileView('preview')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold ${
              mobileView === 'preview' ? 'bg-[#171717] text-white' : 'text-ink-muted'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" /> Live Preview
          </button>
        </div>
      </div>

      {/* 4 Focused Studio Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => {
              setSection(sec.id)
              setMobileView('edit')
            }}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold border transition-all ${
              section === sec.id
                ? 'border-[#171717] bg-[#171717] text-white shadow-xs'
                : 'border-[#E5E7EB] bg-white text-ink-secondary hover:border-[#171717]/40 hover:text-ink'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {saveError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {saveError}
        </p>
      )}
      {saveSuccess && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{saveSuccess}</span>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Studio Editor */}
        <div className={`lg:col-span-7 space-y-5 ${mobileView === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* TAB 1: BRAND & PROFILE */}
          {section === 'profile' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-5">
                <h2 className="text-base font-bold text-ink">Brand Identity &amp; Theme</h2>

                <div className="flex flex-wrap items-center gap-4">
                  <div
                    className={`relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border ${
                      profileImage
                        ? 'border-[#E5E7EB] bg-white p-1.5'
                        : 'border-[#171717] bg-[#171717] text-white shadow-editorial'
                    }`}
                  >
                    {profileImage ? (
                      <img src={profileImage} alt="Business logo" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-lg font-extrabold tracking-tight">{brandInitials}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      className={`inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3.5 py-2 text-xs font-semibold text-ink ${
                        uploadingLogo
                          ? 'opacity-60 cursor-wait'
                          : 'cursor-pointer hover:border-[#171717]/50'
                      }`}
                    >
                      {uploadingLogo ? (
                        <Spinner size={14} />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5 text-[#171717]" />
                      )}
                      <span>
                        {uploadingLogo
                          ? 'Processing Logo…'
                          : profileImage
                            ? 'Replace Brand Logo'
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
                    {profileImage ? (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileImage(null)
                          markDirty()
                        }}
                        className="text-xs font-medium text-rose-600 hover:underline"
                      >
                        Remove Logo (Use Monogram)
                      </button>
                    ) : (
                      <span className="text-xs text-ink-muted">
                        Using brand monogram emblem
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-ink">Business Name *</label>
                    <input
                      value={businessName}
                      onChange={(e) => {
                        setBusinessName(e.target.value)
                        markDirty()
                      }}
                      maxLength={80}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-semibold text-ink focus:border-[#171717] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink">Category</label>
                    <select
                      value={businessCategory}
                      onChange={(e) => {
                        setBusinessCategory(e.target.value)
                        markDirty()
                      }}
                      className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                    >
                      {BUSINESS_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink">City / Area</label>
                    <input
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value)
                        markDirty()
                      }}
                      maxLength={80}
                      placeholder="e.g. Lucknow"
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-ink">Tagline</label>
                    <input
                      value={tagline}
                      onChange={(e) => {
                        setTagline(e.target.value)
                        markDirty()
                      }}
                      maxLength={80}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink">Experience / Highlight</label>
                    <input
                      value={businessExperience}
                      onChange={(e) => {
                        setBusinessExperience(e.target.value)
                        markDirty()
                      }}
                      maxLength={60}
                      placeholder="e.g. 10+ Years"
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-ink">Contact Person</label>
                    <input
                      value={contactPersonName}
                      onChange={(e) => {
                        setContactPersonName(e.target.value)
                        markDirty()
                      }}
                      maxLength={80}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-ink">About Your Business</label>
                      <span className="font-mono text-[11px] text-ink-muted">{bio.length}/280</span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={280}
                      value={bio}
                      onChange={(e) => {
                        setBio(e.target.value)
                        markDirty()
                      }}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-ink">Custom URL Handle (/p/…)</label>
                    <input
                      value={publicSlug}
                      onChange={(e) => {
                        setPublicSlug(normalizePublicSlug(e.target.value))
                        markDirty()
                      }}
                      className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-xs font-mono text-ink focus:border-[#171717] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Storefront Template Switcher */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <ThemeTemplatePicker
                    mode="business"
                    value={theme}
                    onChange={(next) => {
                      setTheme(next)
                      markDirty()
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT & HOURS */}
          {section === 'contact' && (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-4">
              <h2 className="text-base font-bold text-ink">Contact Details &amp; Business Timings</h2>
              <div className="space-y-4">
                <div className="space-y-2 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] p-3.5">
                  <ToggleField
                    label="Business Timings (Working Hours)"
                    value={workingHours}
                    onChange={(v) => {
                      setWorkingHours(v)
                      markDirty()
                    }}
                    visible={visibility.hours}
                    onToggle={() => {
                      setVisibility((v) => ({ ...v, hours: !v.hours }))
                      markDirty()
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {TIMING_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setWorkingHours(preset)
                          markDirty()
                        }}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          workingHours === preset
                            ? 'border-[#171717] bg-[#171717] text-white'
                            : 'border-[#E5E7EB] bg-white text-ink-secondary hover:border-[#171717]/40'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <ToggleField
                  label="Phone Number"
                  value={contactPhone}
                  onChange={(v) => {
                    setContactPhone(v)
                    markDirty()
                  }}
                  visible={visibility.phone}
                  onToggle={() => {
                    setVisibility((v) => ({ ...v, phone: !v.phone }))
                    markDirty()
                  }}
                />
                <ToggleField
                  label="WhatsApp Number"
                  value={whatsappNumber}
                  onChange={(v) => {
                    setWhatsappNumber(v)
                    markDirty()
                  }}
                  visible={visibility.whatsapp}
                  onToggle={() => {
                    setVisibility((v) => ({ ...v, whatsapp: !v.whatsapp }))
                    markDirty()
                  }}
                />
                <ToggleField
                  label="Business Email"
                  value={contactEmail}
                  onChange={(v) => {
                    setContactEmail(v)
                    markDirty()
                  }}
                  visible={visibility.email}
                  onToggle={() => {
                    setVisibility((v) => ({ ...v, email: !v.email }))
                    markDirty()
                  }}
                />
                <ToggleField
                  label="Full Business Address"
                  value={fullAddress}
                  onChange={(v) => {
                    setFullAddress(v)
                    markDirty()
                  }}
                  visible={visibility.address}
                  onToggle={() => {
                    setVisibility((v) => ({ ...v, address: !v.address }))
                    markDirty()
                  }}
                />
                <ToggleField
                  label="Google Maps Location URL"
                  value={googleMapsUrl}
                  onChange={(v) => {
                    setGoogleMapsUrl(v)
                    markDirty()
                  }}
                  visible={visibility.maps}
                  onToggle={() => {
                    setVisibility((v) => ({ ...v, maps: !v.maps }))
                    markDirty()
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: LINKS & SOCIAL (DEDUPED) */}
          {section === 'links' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-ink">
                    Social Channels ({socialLinks.length})
                  </h2>
                  <span className="text-[11px] text-ink-muted">
                    WhatsApp &amp; Maps live in Contact &amp; Hours (no duplicates)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BUSINESS_SOCIAL_PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openNewLinkModal(p.id)}
                      className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-2.5 py-2 text-xs font-semibold text-ink hover:border-[#171717]/40 transition-colors"
                    >
                      <PlatformIcon platform={p.id} size={15} />
                      <span className="truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
                <LinkListEditor
                  items={socialLinks}
                  allLinks={links}
                  onMove={moveLinkById}
                  onDragStart={setDragIndex}
                  onDrop={handleDropById}
                  onToggle={(id) => {
                    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: !l.is_active } : l)))
                    markDirty()
                  }}
                  onEdit={openEditLinkModal}
                  onDelete={(id) => {
                    setLinks((prev) => prev.filter((l) => l.id !== id))
                    markDirty()
                  }}
                />
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-[#525252]" />
                    <span>Business &amp; Custom Links ({businessAndCustomLinks.length})</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => openNewLinkModal('custom', 'Custom Link', 'link')}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#171717] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#262626]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Custom Link
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {EDITOR_BUSINESS_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => openNewLinkModal(tpl.platform, tpl.defaultTitle, tpl.icon)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-1.5 text-xs font-semibold text-ink hover:border-[#171717]/40"
                    >
                      <PlatformIcon platform={tpl.platform} customIcon={tpl.icon} size={14} />
                      <span>+ {tpl.label}</span>
                    </button>
                  ))}
                </div>

                <LinkListEditor
                  items={businessAndCustomLinks}
                  allLinks={links}
                  onMove={moveLinkById}
                  onDragStart={setDragIndex}
                  onDrop={handleDropById}
                  onToggle={(id) => {
                    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: !l.is_active } : l)))
                    markDirty()
                  }}
                  onEdit={openEditLinkModal}
                  onDelete={(id) => {
                    setLinks((prev) => prev.filter((l) => l.id !== id))
                    markDirty()
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 4: SHARE, QR & SECURITY */}
          {section === 'account' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-editorial space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-[#525252]" />
                    <span>Share, QR Code &amp; Publishing</span>
                  </h2>
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-ink-muted">
                    <Lock className="h-3 w-3" /> {dashboard.qr.scan_count} total scans
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F5] p-4">
                  <div className="h-28 w-28 shrink-0 rounded-2xl border border-[#E5E7EB] bg-white p-2 flex items-center justify-center">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt={`QR ${qrNumber}`} className="h-full w-full object-contain" />
                    ) : (
                      <Spinner size={20} />
                    )}
                  </div>
                  <div className="flex-1 space-y-3 text-center sm:text-left min-w-0 w-full">
                    <p className="font-mono text-xs text-ink break-all">{publicShareUrl}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(publicShareUrl)
                          setCopiedPublicUrl(true)
                          setTimeout(() => setCopiedPublicUrl(false), 1500)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-[#171717]/40"
                      >
                        {copiedPublicUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedPublicUrl ? 'Copied' : 'Copy Link'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSingleQr(qrNumber, 'png')}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-[#171717]/40"
                      >
                        <Download className="h-3.5 w-3.5" /> PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSingleQr(qrNumber, 'svg')}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-[#171717]/40"
                      >
                        <Download className="h-3.5 w-3.5" /> SVG
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveAll(!isPublished)}
                    disabled={saving}
                    className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-semibold text-ink hover:border-[#171717]/40"
                  >
                    {isPublished ? 'Switch to Draft Mode' : 'Publish Live Now'}
                  </button>

                  {onOpenMultiQr && (
                    <button
                      type="button"
                      onClick={onOpenMultiQr}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-4 py-2 text-xs font-bold text-[#171717] hover:border-[#171717]/40"
                    >
                      <Layers className="h-3.5 w-3.5 text-[#171717]" />
                      <span>Open Multi-QR Workspace</span>
                    </button>
                  )}
                </div>
              </div>

              <CustomerAccountSettings
                qrNumber={qrNumber}
                sessionToken={sessionToken}
                currentUsageType={dashboard.qr.usage_type}
                onModeSwitched={onModeSwitched ?? onRefresh}
                onReauth={onLogout}
              />
            </div>
          )}
        </div>

        {/* Right: Sticky Live Storefront Preview */}
        <div className={`lg:col-span-5 ${mobileView === 'preview' ? 'block' : 'hidden lg:block'} lg:sticky lg:top-6`}>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-editorial space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">Live Storefront Preview</span>
              <a
                href={publicShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#171717] hover:underline"
              >
                <span>Open Live</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="mx-auto max-w-[360px] rounded-[30px] border-[5px] border-[#171717] bg-[#171717] p-1 shadow-xl overflow-hidden">
              <div className="h-[560px] overflow-y-auto rounded-[24px]">
                <PublicProfileView
                  profile={previewProfile}
                  links={previewLinks}
                  qrNumber={qrNumber}
                  previewMode
                  onThemeChange={(next) => {
                    setTheme(next)
                    markDirty()
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Unsaved Changes Save Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 inset-x-4 z-40 mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#171717] text-white px-4 py-3 shadow-xl flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-medium text-neutral-200">
            You have unsaved storefront changes
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveAll(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#171717] hover:bg-neutral-100 shrink-0 disabled:opacity-60"
          >
            {saving ? <Spinner size={13} /> : <Save className="h-3.5 w-3.5" />}
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      )}

      {/* Add / Edit Link Modal */}
      {linkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setLinkModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">
                {editingLinkId ? 'Edit Link' : 'Add Link'}
              </h3>
              <button type="button" onClick={() => setLinkModalOpen(false)} className="rounded-lg p-1 text-ink-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Platform</label>
                <select
                  value={draftPlatform}
                  onChange={(e) => {
                    const next = e.target.value as SocialPlatform
                    setDraftPlatform(next)
                    if (!editingLinkId) setDraftTitle(getPlatformMeta(next).defaultTitle)
                  }}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-xs font-semibold text-ink focus:border-[#171717] focus:outline-none"
                >
                  {selectableModalPlatforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Link Title *</label>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  maxLength={80}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-xs text-ink focus:border-[#171717] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Destination URL / Handle *</label>
                <input
                  value={draftUrl}
                  onChange={(e) => {
                    setDraftUrl(e.target.value)
                    setLinkError(null)
                  }}
                  placeholder={getPlatformMeta(draftPlatform).placeholder}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-xs font-mono text-ink focus:border-[#171717] focus:outline-none"
                />
              </div>
              {draftPlatform === 'custom' && (
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOM_LINK_ICONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraftIcon(opt.id)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
                        draftIcon === opt.id
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
              <label className="inline-flex items-center gap-2 text-xs font-medium text-ink">
                <input type="checkbox" checked={draftActive} onChange={(e) => setDraftActive(e.target.checked)} />
                <span>Visible on public profile</span>
              </label>
              {linkError && <p className="text-xs font-medium text-rose-600">{linkError}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="rounded-xl border border-[#E5E7EB] px-3.5 py-2 text-xs font-semibold text-ink hover:bg-[#F7F7F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLinkModal}
                className="rounded-xl bg-[#171717] px-4 py-2 text-xs font-bold text-white hover:bg-[#262626]"
              >
                {editingLinkId ? 'Update Link' : 'Add Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleField({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  visible: boolean
  onToggle: () => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-ink">{label}</label>
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
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
        className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
      />
    </div>
  )
}

function LinkListEditor({
  items,
  allLinks,
  onMove,
  onDragStart,
  onDrop,
  onToggle,
  onEdit,
  onDelete,
}: {
  items: DraftLink[]
  allLinks: DraftLink[]
  onMove: (id: string, delta: -1 | 1) => void
  onDragStart: (idx: number) => void
  onDrop: (targetId: string) => void
  onToggle: (id: string) => void
  onEdit: (item: DraftLink) => void
  onDelete: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-surface-border p-5 text-center text-xs text-ink-muted">
        No links in this section yet. Click a channel or template above to add one.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const globalIdx = allLinks.findIndex((l) => l.id === item.id)
        return (
          <div
            key={item.id}
            draggable
            onDragStart={() => onDragStart(globalIdx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(item.id)}
            className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 ${
              item.is_active
                ? 'border-surface-border bg-ghost'
                : 'border-dashed border-surface-border bg-ghost/40 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <GripVertical className="h-4 w-4 text-ink-muted cursor-grab shrink-0" />
              <PlatformIcon platform={item.platform} customIcon={item.icon} size={18} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink truncate">{item.link_title}</p>
                <p className="text-[11px] font-mono text-ink-muted truncate">{item.destination_url}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => onMove(item.id, -1)} className="rounded-lg p-1.5 text-ink-muted hover:text-ink" title="Move up">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onMove(item.id, 1)} className="rounded-lg p-1.5 text-ink-muted hover:text-ink" title="Move down">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onToggle(item.id)} className="rounded-lg p-1.5 text-ink-muted hover:text-ink" title="Toggle visibility">
                {item.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => onEdit(item)} className="rounded-lg p-1.5 text-ink-muted hover:text-ink" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onDelete(item.id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
