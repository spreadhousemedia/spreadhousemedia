import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_AVATAR_ID, isValidAvatarId } from '../../lib/avatars'
import { isValidProfileTheme } from '../../lib/profileThemes'
import { savePersonalProfile } from '../../lib/profileApi'
import {
  isValidDestinationUrl,
  normalizeDestinationUrl,
  normalizePublicSlug,
  validatePlatformLinkUrl,
} from '../../lib/validation'
import type {
  CustomerDashboardData,
  ProfileTheme,
  PublicLinkItem,
  PublicProfileData,
  SocialPlatform,
} from '../../types'
import { OnboardingLayout, type SaveStatus } from './OnboardingLayout'
import { PlatformSelector } from './PlatformSelector'
import { SocialLinkForm } from './SocialLinkForm'
import type { CustomLinkDraft } from './CustomLinkEditor'
import { AvatarPicker } from './AvatarPicker'
import { ProfileDetailsForm } from './ProfileDetailsForm'
import { ProfilePreview } from './ProfilePreview'
import { PublishConfirmation } from './PublishConfirmation'

interface PersonalOnboardingProps {
  dashboard: CustomerDashboardData
  sessionToken: string
  onRefresh: () => Promise<void>
  onCompleteToEditor: () => void
  onSwitchMode?: () => void
  onLogout: () => void
}

interface OnboardingDraftSnapshot {
  step: number
  selectedPlatforms: SocialPlatform[]
  socialValues: Partial<Record<SocialPlatform, string>>
  customLinks: CustomLinkDraft[]
  avatarId: string
  displayName: string
  tagline: string
  bio: string
  publicSlug: string
  theme: ProfileTheme
}

const STEP_LABELS: Record<number, string> = {
  1: 'Choose platforms',
  2: 'Add links',
  3: 'Select avatar',
  4: 'Profile details',
  5: 'Preview profile',
  6: 'Published',
}

function draftStorageKey(qrNumber: string) {
  return `spreadnfc_onboarding_draft_${qrNumber.toUpperCase()}`
}

function loadLocalDraft(qrNumber: string): OnboardingDraftSnapshot | null {
  try {
    const raw = sessionStorage.getItem(draftStorageKey(qrNumber))
    if (!raw) return null
    return JSON.parse(raw) as OnboardingDraftSnapshot
  } catch {
    return null
  }
}

function saveLocalDraft(qrNumber: string, snap: OnboardingDraftSnapshot): void {
  try {
    sessionStorage.setItem(draftStorageKey(qrNumber), JSON.stringify(snap))
  } catch {
    // ignore storage errors
  }
}

function clearLocalDraft(qrNumber: string): void {
  try {
    sessionStorage.removeItem(draftStorageKey(qrNumber))
  } catch {
    // ignore
  }
}

export function PersonalOnboarding({
  dashboard,
  sessionToken,
  onRefresh,
  onCompleteToEditor,
  onSwitchMode,
  onLogout,
}: PersonalOnboardingProps) {
  const qrNumber = dashboard.qr.qr_number

  const initialState = useMemo((): OnboardingDraftSnapshot => {
    const local = loadLocalDraft(qrNumber)
    const dbProfile = dashboard.profile
    const dbLinks = dashboard.links ?? []

    // Prefer DB values if already saved, overlaid with any unsaved step progress in sessionStorage
    const dbSocialPlatforms: SocialPlatform[] = []
    const dbSocialValues: Partial<Record<SocialPlatform, string>> = {}
    const dbCustomLinks: CustomLinkDraft[] = []

    for (const l of dbLinks) {
      if (l.platform === 'custom') {
        dbCustomLinks.push({
          id: l.id,
          title: l.link_title,
          url: l.destination_url,
          icon: l.icon || 'link',
        })
      } else {
        if (!dbSocialPlatforms.includes(l.platform)) {
          dbSocialPlatforms.push(l.platform)
        }
        if (!dbSocialValues[l.platform]) {
          dbSocialValues[l.platform] = l.destination_url
        }
      }
    }
    if (dbCustomLinks.length > 0 && !dbSocialPlatforms.includes('custom')) {
      dbSocialPlatforms.push('custom')
    }

    const dbAvatar =
      dbProfile?.avatar_id && isValidAvatarId(dbProfile.avatar_id)
        ? dbProfile.avatar_id
        : DEFAULT_AVATAR_ID

    return {
      step: local?.step && local.step >= 1 && local.step <= 5 ? local.step : 1,
      selectedPlatforms:
        local?.selectedPlatforms?.length ? local.selectedPlatforms : dbSocialPlatforms,
      socialValues:
        local?.socialValues && Object.keys(local.socialValues).length > 0
          ? local.socialValues
          : dbSocialValues,
      customLinks:
        local?.customLinks?.length ? local.customLinks : dbCustomLinks,
      avatarId:
        local?.avatarId && isValidAvatarId(local.avatarId) ? local.avatarId : dbAvatar,
      displayName: local?.displayName || dbProfile?.profile_name || '',
      tagline: local?.tagline ?? dbProfile?.tagline ?? '',
      bio: local?.bio ?? dbProfile?.bio ?? '',
      publicSlug: local?.publicSlug ?? dbProfile?.public_slug ?? '',
      theme:
        local?.theme ??
        (isValidProfileTheme(dbProfile?.theme) ? dbProfile.theme : 'per_paper'),
    }
  }, [qrNumber, dashboard.profile, dashboard.links])

  const [step, setStep] = useState<number>(initialState.step)
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(
    initialState.selectedPlatforms,
  )
  const [socialValues, setSocialValues] = useState<Partial<Record<SocialPlatform, string>>>(
    initialState.socialValues,
  )
  const [customLinks, setCustomLinks] = useState<CustomLinkDraft[]>(initialState.customLinks)
  const [avatarId, setAvatarId] = useState<string>(initialState.avatarId)
  const [displayName, setDisplayName] = useState<string>(initialState.displayName)
  const [tagline, setTagline] = useState<string>(initialState.tagline)
  const [bio, setBio] = useState<string>(initialState.bio)
  const [publicSlug, setPublicSlug] = useState<string>(initialState.publicSlug)
  const [theme, setTheme] = useState<ProfileTheme>(initialState.theme)

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishedSlug, setPublishedSlug] = useState<string | null>(
    dashboard.profile?.public_slug ?? null,
  )

  const autosaveTimerRef = useRef<number | null>(null)

  // Keep sessionStorage draft synchronized so page refreshes never lose progress
  useEffect(() => {
    if (step >= 6) return
    saveLocalDraft(qrNumber, {
      step,
      selectedPlatforms,
      socialValues,
      customLinks,
      avatarId,
      displayName,
      tagline,
      bio,
      publicSlug,
      theme,
    })
  }, [
    qrNumber,
    step,
    selectedPlatforms,
    socialValues,
    customLinks,
    avatarId,
    displayName,
    tagline,
    bio,
    publicSlug,
    theme,
  ])

  const buildValidatedLinksPayload = useCallback(() => {
    const payload: Array<{
      platform: SocialPlatform
      link_title: string
      destination_url: string
      icon: string | null
      is_active: boolean
    }> = []
    const seen = new Set<string>()

    for (const platform of selectedPlatforms) {
      if (platform === 'custom') continue
      const raw = socialValues[platform]?.trim()
      if (!raw) continue
      const res = validatePlatformLinkUrl(platform, raw)
      if (!res.ok) continue
      const key = `${platform}|${res.normalizedUrl.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      payload.push({
        platform,
        link_title: platform,
        destination_url: res.normalizedUrl,
        icon: null,
        is_active: true,
      })
    }

    for (const item of customLinks) {
      const title = item.title.trim()
      const normUrl = normalizeDestinationUrl(item.url)
      if (!title || !isValidDestinationUrl(normUrl)) continue
      const key = `custom|${normUrl.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      payload.push({
        platform: 'custom',
        link_title: title,
        destination_url: normUrl,
        icon: item.icon || 'link',
        is_active: true,
      })
    }

    return payload
  }, [selectedPlatforms, socialValues, customLinks])

  const persistDraftToServer = useCallback(
    async (publishNow: boolean): Promise<{ ok: boolean; error?: string; slug?: string | null }> => {
      const cleanName = displayName.trim()
      if (!cleanName) {
        return { ok: false, error: 'Display Name is required.' }
      }

      const cleanSlug = publicSlug.trim() ? normalizePublicSlug(publicSlug) : null
      setSaveStatus('saving')

      const result = await savePersonalProfile({
        sessionToken,
        qrNumber,
        previousSlug: dashboard.profile?.public_slug,
        profileName: cleanName,
        avatarId,
        tagline: tagline.trim() || null,
        bio: bio.trim().slice(0, 160) || null,
        publicSlug: cleanSlug,
        theme,
        isPublished: publishNow,
        links: buildValidatedLinksPayload(),
      })

      if (!result.ok) {
        setSaveStatus('error')
        return { ok: false, error: result.error }
      }

      setSaveStatus('saved')
      return { ok: true, slug: result.publicSlug ?? cleanSlug }
    },
    [
      displayName,
      publicSlug,
      sessionToken,
      qrNumber,
      dashboard.profile?.public_slug,
      avatarId,
      tagline,
      bio,
      theme,
      buildValidatedLinksPayload,
    ],
  )

  // Debounced server autosave once displayName has been entered (Steps 4–5)
  useEffect(() => {
    if (step < 4 || step >= 6 || !displayName.trim()) return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      persistDraftToServer(false)
    }, 900)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [step, displayName, tagline, bio, publicSlug, avatarId, theme, persistDraftToServer])

  function handleTogglePlatform(platform: SocialPlatform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    )
  }

  async function handleGoToStep(nextStep: number) {
    if (step === 4 && nextStep === 5 && displayName.trim()) {
      await persistDraftToServer(false)
    }
    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handlePublish() {
    if (publishing) return
    setPublishError(null)
    setPublishing(true)

    const res = await persistDraftToServer(true)
    setPublishing(false)

    if (!res.ok) {
      setPublishError(res.error || 'Could not publish your profile. Please try again.')
      return
    }

    setPublishedSlug(res.slug ?? null)
    clearLocalDraft(qrNumber)
    setStep(6)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    await onRefresh()
  }

  const previewProfile: PublicProfileData = {
    profile_name: displayName.trim() || qrNumber,
    profile_image: `/avatars/${avatarId}.webp`,
    avatar_id: avatarId,
    tagline: tagline.trim() || null,
    bio: bio.trim() || null,
    public_slug: publicSlug.trim() ? normalizePublicSlug(publicSlug) : null,
    theme,
  }

  const previewLinks: PublicLinkItem[] = buildValidatedLinksPayload().map((l, idx) => ({
    id: `preview-${idx}`,
    platform: l.platform,
    link_title: l.link_title,
    destination_url: l.destination_url,
    icon: l.icon,
    display_order: idx,
  }))

  const handleBack =
    step > 1 && step < 6
      ? () => {
          if (step === 3 && selectedPlatforms.length === 0) {
            setStep(1)
          } else {
            setStep((s) => Math.max(1, s - 1))
          }
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      : undefined

  return (
    <OnboardingLayout
      qrNumber={qrNumber}
      modeLabel="Personal Profile"
      currentStep={step}
      totalSteps={6}
      stepLabel={STEP_LABELS[step] ?? 'Setup'}
      saveStatus={saveStatus}
      onBack={handleBack}
      onSwitchMode={onSwitchMode}
      onLogout={onLogout}
    >
      {step === 1 && (
        <PlatformSelector
          selected={selectedPlatforms}
          onToggle={handleTogglePlatform}
          onContinue={() => handleGoToStep(2)}
          onSkip={() => handleGoToStep(3)}
        />
      )}

      {step === 2 && (
        <SocialLinkForm
          selectedPlatforms={selectedPlatforms}
          socialValues={socialValues}
          customLinks={customLinks}
          onSocialChange={(platform, value) =>
            setSocialValues((prev) => ({ ...prev, [platform]: value }))
          }
          onCustomLinksChange={setCustomLinks}
          onContinue={() => handleGoToStep(3)}
          onChangePlatforms={() => handleGoToStep(1)}
        />
      )}

      {step === 3 && (
        <AvatarPicker
          selectedAvatarId={avatarId}
          onSelect={(id) => setAvatarId(id)}
          onContinue={() => handleGoToStep(4)}
        />
      )}

      {step === 4 && (
        <ProfileDetailsForm
          qrNumber={qrNumber}
          sessionToken={sessionToken}
          displayName={displayName}
          tagline={tagline}
          bio={bio}
          publicSlug={publicSlug}
          onChange={(patch) => {
            if (patch.displayName !== undefined) setDisplayName(patch.displayName)
            if (patch.tagline !== undefined) setTagline(patch.tagline)
            if (patch.bio !== undefined) setBio(patch.bio)
            if (patch.publicSlug !== undefined) setPublicSlug(patch.publicSlug)
          }}
          onContinue={() => handleGoToStep(5)}
        />
      )}

      {step === 5 && (
        <ProfilePreview
          qrNumber={qrNumber}
          profile={previewProfile}
          links={previewLinks}
          publishing={publishing}
          publishError={publishError}
          onThemeChange={setTheme}
          onEditStep={(target) => handleGoToStep(target)}
          onPublish={handlePublish}
        />
      )}

      {step === 6 && (
        <PublishConfirmation
          qrNumber={qrNumber}
          publicSlug={publishedSlug}
          onOpenEditor={onCompleteToEditor}
        />
      )}
    </OnboardingLayout>
  )
}

