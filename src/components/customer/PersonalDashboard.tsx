import { useState } from 'react'
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  Layers,
  Link2,
  Lock,
  Pencil,
  Plus,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'
import {
  CURATED_AVATARS,
  CURATED_AVATAR_MAP,
  DEFAULT_AVATAR_ID,
  isValidAvatarId,
} from '../../lib/avatars'
import { profilePublicUrl } from '../../lib/config'
import { isValidProfileTheme } from '../../lib/profileThemes'
import { savePersonalProfile } from '../../lib/profileApi'
import {
  getPlatformMeta,
  isValidPublicSlug,
  normalizePublicSlug,
  SOCIAL_PLATFORMS,
  validatePlatformLinkUrl,
} from '../../lib/validation'
import {
  type CustomerDashboardData,
  type ProfileTheme,
  type QrLink,
  type SocialPlatform,
  type UsageType,
} from '../../types'
import { Spinner } from '../Spinner'
import { CUSTOM_LINK_ICONS, PlatformIcon } from '../profile/PlatformIcons'
import { PublicProfileView } from '../profile/PublicProfileView'
import { ThemeTemplatePicker } from '../profile/ThemeTemplatePicker'
import { CustomerAccountSettings } from './CustomerAccountSettings'

interface PersonalDashboardProps {
  dashboard: CustomerDashboardData
  sessionToken: string
  multiQrCount?: number
  onOpenMultiQr?: () => void
  onRefresh: () => Promise<void>
  onSwitchMode?: () => void
  onModeSwitched?: (nextMode?: UsageType | 'reset') => Promise<void>
  onStartOnboarding?: () => void
  onLogout: () => void
}

type DraftLink = {
  id: string
  platform: SocialPlatform
  link_title: string
  destination_url: string
  icon: string | null
  is_active: boolean
}

export function PersonalDashboard({
  dashboard,
  sessionToken,
  multiQrCount = 1,
  onOpenMultiQr,
  onRefresh,
  onSwitchMode,
  onModeSwitched,
  onStartOnboarding,
  onLogout,
}: PersonalDashboardProps) {
  const qrNumber = dashboard.qr.qr_number

  const initialAvatarId =
    dashboard.profile?.avatar_id && isValidAvatarId(dashboard.profile.avatar_id)
      ? dashboard.profile.avatar_id
      : DEFAULT_AVATAR_ID

  // Profile fields state
  const [profileName, setProfileName] = useState(dashboard.profile?.profile_name || '')
  const [avatarId, setAvatarId] = useState<string>(initialAvatarId)
  const [tagline, setTagline] = useState(dashboard.profile?.tagline || '')
  const [bio, setBio] = useState((dashboard.profile?.bio || '').slice(0, 160))
  const [publicSlug, setPublicSlug] = useState(dashboard.profile?.public_slug || '')
  const [theme, setTheme] = useState<ProfileTheme>(
    isValidProfileTheme(dashboard.profile?.theme) ? dashboard.profile.theme : 'per_paper',
  )
  const [isPublished, setIsPublished] = useState<boolean>(
    dashboard.profile?.is_published ?? false,
  )

  // Links collection state
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

  // Link Editor modal state
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [draftPlatform, setDraftPlatform] = useState<SocialPlatform>('instagram')
  const [draftTitle, setDraftTitle] = useState('Instagram')
  const [draftUrl, setDraftUrl] = useState('')
  const [draftIcon, setDraftIcon] = useState<string>('link')
  const [draftActive, setDraftActive] = useState(true)
  const [linkFormError, setLinkFormError] = useState<string | null>(null)

  // Drag & drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState<'editor' | 'account'>('editor')
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [avatarDrawerOpen, setAvatarDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false)

  const activeIdentifier = publicSlug.trim() ? normalizePublicSlug(publicSlug) : qrNumber
  const publicShareUrl = profilePublicUrl(activeIdentifier)
  const fallbackShareUrl = profilePublicUrl(qrNumber)
  const currentAvatar = CURATED_AVATAR_MAP.get(avatarId) ?? CURATED_AVATARS[0]

  function openNewLinkModal(platform: SocialPlatform) {
    const meta = getPlatformMeta(platform)
    setEditingLinkId(null)
    setDraftPlatform(platform)
    setDraftTitle(meta.defaultTitle)
    setDraftUrl('')
    setDraftIcon('link')
    setDraftActive(true)
    setLinkFormError(null)
    setLinkModalOpen(true)
  }

  function openEditLinkModal(link: DraftLink) {
    setEditingLinkId(link.id)
    setDraftPlatform(link.platform)
    setDraftTitle(link.link_title)
    setDraftUrl(link.destination_url)
    setDraftIcon(link.icon || 'link')
    setDraftActive(link.is_active)
    setLinkFormError(null)
    setLinkModalOpen(true)
  }

  function handleSaveLinkModal() {
    setLinkFormError(null)
    const cleanTitle = draftTitle.trim()
    if (!cleanTitle || cleanTitle.length > 80) {
      setLinkFormError('Please enter a link title (1–80 characters).')
      return
    }

    const urlCheck = validatePlatformLinkUrl(draftPlatform, draftUrl)
    if (!urlCheck.ok) {
      setLinkFormError(urlCheck.error)
      return
    }

    const duplicate = links.some(
      (l) =>
        l.id !== editingLinkId &&
        l.platform === draftPlatform &&
        l.destination_url.toLowerCase() === urlCheck.normalizedUrl.toLowerCase(),
    )
    if (duplicate) {
      setLinkFormError('You already added this exact platform and URL.')
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
              destination_url: urlCheck.normalizedUrl,
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
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          platform: draftPlatform,
          link_title: cleanTitle,
          destination_url: urlCheck.normalizedUrl,
          icon: draftPlatform === 'custom' ? draftIcon : null,
          is_active: draftActive,
        },
      ])
    }

    setLinkModalOpen(false)
    setSaveSuccess(null)
  }

  function moveLink(index: number, direction: -1 | 1) {
    const nextIdx = index + direction
    if (nextIdx < 0 || nextIdx >= links.length) return
    setLinks((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(nextIdx, 0, item)
      return copy
    })
    setSaveSuccess(null)
  }

  function handleDrop(targetIdx: number) {
    if (dragIndex === null || dragIndex === targetIdx) {
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
    setSaveSuccess(null)
  }

  function toggleLinkActive(id: string) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: !l.is_active } : l)))
    setSaveSuccess(null)
  }

  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id))
    setSaveSuccess(null)
  }

  async function handleSaveAll(overridePublish?: boolean) {
    setSaveError(null)
    setSaveSuccess(null)

    const cleanName = profileName.trim()
    if (!cleanName || cleanName.length > 80) {
      setSaveError('Please enter your Display Name (1–80 characters) before saving.')
      return
    }

    const cleanSlug = publicSlug.trim() ? normalizePublicSlug(publicSlug) : ''
    if (cleanSlug && !isValidPublicSlug(cleanSlug)) {
      setSaveError(
        'Custom username must be 3–40 lowercase letters, numbers, hyphens, or underscores (and not a reserved word).',
      )
      return
    }

    const nextPublish = overridePublish !== undefined ? overridePublish : isPublished

    setSaving(true)
    const result = await savePersonalProfile({
      sessionToken,
      qrNumber,
      previousSlug: dashboard.profile?.public_slug,
      profileName: cleanName,
      avatarId,
      tagline: tagline.trim() || null,
      bio: bio.trim().slice(0, 160) || null,
      publicSlug: cleanSlug || null,
      theme,
      isPublished: nextPublish,
      links: links.map((l) => ({
        platform: l.platform,
        link_title: l.link_title,
        destination_url: l.destination_url,
        icon: l.icon,
        is_active: l.is_active,
      })),
    })
    setSaving(false)

    if (!result.ok) {
      setSaveError(result.error || 'Could not save your profile. Please try again.')
      return
    }

    setIsPublished(nextPublish)
    setPublicSlug(cleanSlug)
    setSaveSuccess(
      nextPublish
        ? 'Profile saved & published! Your QR code now opens your live digital profile.'
        : 'Draft saved! Preview your profile anytime and publish when ready.',
    )
    await onRefresh()
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(publicShareUrl)
    setCopiedPublicUrl(true)
    setTimeout(() => setCopiedPublicUrl(false), 1500)
  }

  const previewLinks = links
    .filter((l) => l.is_active)
    .map((l, i) => ({
      id: l.id,
      platform: l.platform,
      link_title: l.link_title,
      destination_url: l.destination_url,
      icon: l.icon,
      display_order: i,
    }))

  const previewProfile = {
    profile_name: profileName.trim() || qrNumber,
    profile_image: currentAvatar.src,
    avatar_id: avatarId,
    tagline: tagline.trim() || null,
    bio: bio.trim() || null,
    public_slug: publicSlug.trim() ? normalizePublicSlug(publicSlug) : null,
    theme,
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 relative z-10 text-[#141413]">
      {/* Top Customer Header Bar */}
      <div className="rounded-2xl border border-[#E6E4DF] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(20,20,19,0.03)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[14px] bg-[#ECEAE4] ring-1 ring-inset ring-black/[0.07]">
            <img
              src={currentAvatar.src}
              alt={profileName || qrNumber}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-base text-[#141413]">{qrNumber}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>Personal Profile</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${isPublished
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
              >
                {isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#5C5B57]">
              Public Profile:{' '}
              <span className="font-mono font-medium text-[#141413]">{publicShareUrl}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSwitchMode && (
            <button
              type="button"
              onClick={onSwitchMode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-2 text-xs font-semibold text-[#141413] hover:border-[#141413] transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Switch Mode</span>
            </button>
          )}
          {onOpenMultiQr && (
            <button
              type="button"
              onClick={onOpenMultiQr}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Multi-QR{multiQrCount > 1 ? ` (${multiQrCount})` : ''}</span>
            </button>
          )}
          {onStartOnboarding && (
            <button
              type="button"
              onClick={onStartOnboarding}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-2 text-xs font-semibold text-[#141413] hover:border-[#141413] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Setup Wizard</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F2EE] transition-colors"
          >
            {copiedPublicUrl ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedPublicUrl ? 'Copied' : 'Copy URL'}</span>
          </button>

          {isPublished && (
            <a
              href={publicShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#141413] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2A2A28] transition-colors"
            >
              <span>View Live</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] px-3 py-2 text-xs font-semibold text-[#5C5B57] hover:text-[#141413] hover:bg-[#FAF9F7] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[#E6E4DF] bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${activeTab === 'editor' ? 'bg-[#141413] text-white' : 'text-[#5C5B57] hover:text-[#141413]'
              }`}
          >
            Profile &amp; Links
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${activeTab === 'account' ? 'bg-[#141413] text-white' : 'text-[#5C5B57] hover:text-[#141413]'
              }`}
          >
            QR Code &amp; Security
          </button>
        </div>

        {/* Mobile Live Preview Toggle */}
        {activeTab === 'editor' && (
          <button
            type="button"
            onClick={() => setMobilePreviewOpen((o) => !o)}
            className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413]"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>{mobilePreviewOpen ? 'Back to Editor' : 'Live Preview'}</span>
          </button>
        )}
      </div>

      {activeTab === 'account' ? (
        <CustomerAccountSettings
          qrNumber={qrNumber}
          sessionToken={sessionToken}
          currentUsageType={dashboard.qr.usage_type}
          onModeSwitched={onModeSwitched ?? onRefresh}
          onReauth={onLogout}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Editor */}
          <div className={`lg:col-span-7 space-y-5 ${mobilePreviewOpen ? 'hidden lg:block' : 'block'}`}>
            {/* 1. Profile Identity & Avatar */}
            <section className="rounded-2xl border border-[#E6E4DF] bg-white p-5 sm:p-6 space-y-5">
              <div className="space-y-4">
                <h2 className="text-base font-bold text-[#141413]">1. Digital Identity</h2>
                <ThemeTemplatePicker
                  mode="personal"
                  value={theme}
                  onChange={setTheme}
                />
              </div>

              {/* Curated Avatar Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#E6E4DF] bg-[#FAF9F7] p-3.5">
                  <div className="flex items-center gap-3.5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px] bg-[#ECEAE4] ring-1 ring-inset ring-black/[0.08]">
                      <img
                        src={currentAvatar.src}
                        alt={currentAvatar.label}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[#6F6E69]">
                        Curated Avatar
                      </p>
                      <p className="text-sm font-semibold text-[#141413]">{currentAvatar.label}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAvatarDrawerOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-white px-3 py-2 text-xs font-semibold text-[#141413] hover:border-[#141413] transition-colors"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>{avatarDrawerOpen ? 'Done' : 'Change Avatar'}</span>
                  </button>
                </div>

                {avatarDrawerOpen && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 pt-1">
                    {CURATED_AVATARS.map((av) => {
                      const selected = av.id === avatarId
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => {
                            setAvatarId(av.id)
                            setSaveSuccess(null)
                          }}
                          aria-label={av.label}
                          aria-pressed={selected}
                          className={`relative aspect-square overflow-hidden rounded-[16px] bg-[#ECEAE4] transition-all ${selected
                              ? 'ring-2 ring-[#141413] ring-offset-2'
                              : 'ring-1 ring-inset ring-black/[0.08] hover:ring-black/25'
                            }`}
                        >
                          <img src={av.src} alt={av.label} className="h-full w-full object-cover" />
                          {selected && (
                            <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#141413] text-white">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Name & Custom Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profileName" className="mb-1 block text-xs font-semibold text-[#42413D]">
                    Display Name *
                  </label>
                  <input
                    id="profileName"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    maxLength={80}
                    placeholder="e.g. Brijesh Sharma"
                    className="w-full rounded-xl border border-[#E6E4DF] px-3.5 py-2.5 text-sm text-[#141413] focus:border-[#141413] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="publicSlug" className="mb-1 block text-xs font-semibold text-[#42413D]">
                    Public Username (Optional)
                  </label>
                  <div className="flex items-center rounded-xl border border-[#E6E4DF] overflow-hidden focus-within:border-[#141413]">
                    <span className="bg-[#FAF9F7] px-2.5 py-2.5 text-xs font-mono text-[#6F6E69] border-r border-[#E6E4DF] shrink-0">
                      /p/
                    </span>
                    <input
                      id="publicSlug"
                      value={publicSlug}
                      onChange={(e) => setPublicSlug(normalizePublicSlug(e.target.value))}
                      maxLength={40}
                      placeholder={qrNumber.toLowerCase()}
                      className="w-full px-3 py-2.5 text-sm font-mono text-[#141413] focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#6F6E69] truncate">
                    Permanent fallback <span className="font-mono">{fallbackShareUrl}</span> always works.
                  </p>
                </div>
              </div>

              {/* Professional Tagline */}
              <div>
                <label htmlFor="profileTagline" className="mb-1 block text-xs font-semibold text-[#42413D]">
                  Professional Tagline (Optional)
                </label>
                <input
                  id="profileTagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Digital Creator, Founder, Designer"
                  className="w-full rounded-xl border border-[#E6E4DF] px-3.5 py-2.5 text-sm text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>

              {/* About */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="profileBio" className="text-xs font-semibold text-[#42413D]">
                    About (Optional)
                  </label>
                  <span className="font-mono text-[11px] text-[#6F6E69]">{bio.length}/160</span>
                </div>
                <textarea
                  id="profileBio"
                  rows={2}
                  maxLength={160}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people a little about yourself..."
                  className="w-full rounded-xl border border-[#E6E4DF] px-3.5 py-2.5 text-sm text-[#141413] focus:border-[#141413] focus:outline-none resize-none"
                />
              </div>
            </section>

            {/* 2. Add Social & Custom Links */}
            <section className="rounded-2xl border border-[#E6E4DF] bg-white p-5 sm:p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#141413]">2. Add Social &amp; Custom Links</h2>
                <p className="mt-0.5 text-xs text-[#5C5B57]">
                  Social platforms appear as a clean icon grid; Custom Links appear as full-width buttons.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => openNewLinkModal(platform.id)}
                    className="flex items-center gap-2 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-2.5 text-left text-xs font-semibold text-[#141413] hover:border-[#141413] hover:bg-white transition-colors"
                  >
                    <PlatformIcon platform={platform.id} size={17} className="shrink-0" />
                    <span className="truncate">{platform.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Manage & Reorder Links */}
            <section className="rounded-2xl border border-[#E6E4DF] bg-white p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#141413]">
                    3. Your Links ({links.length})
                  </h2>
                  <p className="text-xs text-[#5C5B57]">
                    Drag to reorder or use the arrow buttons.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openNewLinkModal('custom')}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#141413] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2A2A28]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Custom Link</span>
                </button>
              </div>

              {links.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D5D2CA] p-6 text-center text-xs text-[#6F6E69]">
                  <Link2 className="mx-auto h-6 w-6 opacity-50 mb-2" />
                  No links added yet. Select a platform above to add your first link.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {links.map((link, idx) => (
                    <div
                      key={link.id}
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(idx)}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${dragIndex === idx
                          ? 'border-[#141413] bg-[#FAF9F7] opacity-70'
                          : link.is_active
                            ? 'border-[#E6E4DF] bg-white'
                            : 'border-[#E6E4DF] bg-[#FAF9F7] opacity-60'
                        }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="cursor-grab text-[#9E9C96] hover:text-[#42413D] shrink-0"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E6E4DF] bg-[#FAF9F7]">
                          <PlatformIcon platform={link.platform} customIcon={link.icon} size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#141413]">
                            {link.link_title}
                          </p>
                          <p className="truncate text-xs font-mono text-[#6F6E69]">
                            {link.destination_url}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveLink(idx, -1)}
                          disabled={idx === 0}
                          aria-label={`Move ${link.link_title} up`}
                          className="rounded-lg p-1.5 text-[#5C5B57] hover:bg-[#F3F2EE] disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLink(idx, 1)}
                          disabled={idx === links.length - 1}
                          aria-label={`Move ${link.link_title} down`}
                          className="rounded-lg p-1.5 text-[#5C5B57] hover:bg-[#F3F2EE] disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleLinkActive(link.id)}
                          title={link.is_active ? 'Hide link' : 'Show link'}
                          aria-label={link.is_active ? `Hide ${link.link_title}` : `Show ${link.link_title}`}
                          className={`rounded-lg p-1.5 transition-colors ${link.is_active
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-[#9E9C96] hover:bg-[#F3F2EE]'
                            }`}
                        >
                          {link.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditLinkModal(link)}
                          aria-label={`Edit ${link.link_title}`}
                          className="rounded-lg p-1.5 text-[#5C5B57] hover:bg-[#F3F2EE]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLink(link.id)}
                          aria-label={`Delete ${link.link_title}`}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Save & Publish Bar */}
            <section className="rounded-2xl border border-[#E6E4DF] bg-white p-5 space-y-3">
              {saveError && (
                <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
                  {saveError}
                </p>
              )}
              {saveSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-800 font-medium flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccess}</span>
                  </span>
                  {isPublished && (
                    <a
                      href={publicShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 font-bold underline"
                    >
                      Open Profile
                    </a>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-[#CFCBC3] text-[#141413] focus:ring-[#141413]"
                  />
                  <div>
                    <span className="block text-xs font-bold text-[#141413]">
                      Publish profile publicly
                    </span>
                    <span className="block text-[11px] text-[#6F6E69]">
                      Uncheck to keep as a private draft while editing.
                    </span>
                  </div>
                </label>

                <div className="flex items-center gap-2">
                  {!isPublished && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveAll(false)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-white px-4 py-2.5 text-xs font-bold text-[#141413] hover:bg-[#FAF9F7] disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Draft</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveAll(isPublished)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#141413] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#2A2A28] disabled:opacity-60"
                  >
                    {saving && <Spinner size={15} />}
                    <span>{isPublished ? 'Save & Update Profile' : 'Save & Publish Profile'}</span>
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Live Mobile Preview */}
          <div className={`lg:col-span-5 lg:sticky lg:top-6 ${mobilePreviewOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="rounded-2xl border border-[#E6E4DF] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#6F6E69] flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" />
                  Live Profile Preview
                </span>
                <span className="text-[11px] text-[#6F6E69]">
                  {previewLinks.length} active {previewLinks.length === 1 ? 'link' : 'links'}
                </span>
              </div>

              <div className="mx-auto max-w-[360px] rounded-[2rem] border-[5px] border-[#1E1E20] bg-[#1E1E20] overflow-hidden shadow-lg">
                <div className="h-[580px] overflow-y-auto rounded-[1.6rem]">
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

      {/* Add / Edit Link Modal */}
      {linkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={() => setLinkModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E6E4DF] bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E6E4DF] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6E4DF] bg-[#FAF9F7]">
                  <PlatformIcon platform={draftPlatform} customIcon={draftIcon} size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#141413]">
                    {editingLinkId ? 'Edit Link' : `Add ${getPlatformMeta(draftPlatform).label}`}
                  </h3>
                  <p className="text-xs text-[#6F6E69]">
                    Enter a handle, phone number, or full HTTPS URL.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="rounded-lg p-1 text-[#6F6E69] hover:text-[#141413]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#42413D]">
                  Platform
                </label>
                <select
                  value={draftPlatform}
                  onChange={(e) => {
                    const next = e.target.value as SocialPlatform
                    const prevMeta = getPlatformMeta(draftPlatform)
                    const nextMeta = getPlatformMeta(next)
                    setDraftPlatform(next)
                    if (!editingLinkId && (!draftTitle.trim() || draftTitle === prevMeta.defaultTitle)) {
                      setDraftTitle(nextMeta.defaultTitle)
                    }
                  }}
                  className="w-full rounded-xl border border-[#E6E4DF] px-3 py-2.5 text-sm text-[#141413] focus:border-[#141413] focus:outline-none"
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {draftPlatform === 'custom' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#42413D]">
                    Button Title
                  </label>
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    maxLength={80}
                    placeholder="e.g. My Portfolio"
                    className="w-full rounded-xl border border-[#E6E4DF] px-3.5 py-2.5 text-sm text-[#141413] focus:border-[#141413] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#42413D]">
                  {draftPlatform === 'custom' ? 'Destination URL' : 'Username / Phone / URL'}
                </label>
                <input
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  inputMode="url"
                  placeholder={getPlatformMeta(draftPlatform).placeholder}
                  className="w-full rounded-xl border border-[#E6E4DF] px-3.5 py-2.5 text-sm text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>

              {draftPlatform === 'custom' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#42413D]">
                    Optional Icon
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CUSTOM_LINK_ICONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraftIcon(opt.id)}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[10px] font-medium transition-colors ${draftIcon === opt.id
                            ? 'border-[#141413] bg-[#F7F6F3] text-[#141413]'
                            : 'border-[#E6E4DF] text-[#6F6E69] hover:bg-[#FAF9F7]'
                          }`}
                      >
                        <PlatformIcon platform="custom" customIcon={opt.id} size={15} />
                        <span className="truncate w-full text-center">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-medium text-[#141413] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftActive}
                  onChange={(e) => setDraftActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[#CFCBC3] text-[#141413]"
                />
                <span>Show this link on public profile</span>
              </label>

              {linkFormError && (
                <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 font-medium">
                  {linkFormError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="rounded-xl border border-[#E6E4DF] px-4 py-2 text-xs font-semibold text-[#5C5B57] hover:bg-[#FAF9F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLinkModal}
                className="rounded-xl bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2A28]"
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
