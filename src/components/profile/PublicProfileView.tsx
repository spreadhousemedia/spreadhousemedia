import { useEffect, useState } from 'react'
import { Wifi } from 'lucide-react'
import type { ProfileTheme, PublicLinkItem, PublicProfileData } from '../../types'
import { isValidDestinationUrl } from '../../lib/validation'
import { ProfileHeader } from './ProfileHeader'
import { ProfileAbout } from './ProfileAbout'
import { SocialIconGrid } from './SocialIconGrid'
import { CustomLinkList } from './CustomLinkList'
import { ThemeToggle } from './ThemeToggle'
import { ProfileFooter } from './ProfileFooter'

interface PublicProfileViewProps {
  profile: PublicProfileData
  links: PublicLinkItem[]
  qrNumber: string
  /** When true, renders compactly inside an onboarding/editor preview container */
  previewMode?: boolean
  /** Optional controlled theme override for live previewing */
  onThemeChange?: (next: ProfileTheme) => void
}

export function PublicProfileView({
  profile,
  links,
  qrNumber,
  previewMode = false,
  onThemeChange,
}: PublicProfileViewProps) {
  const initialTheme: ProfileTheme = profile.theme === 'dark' ? 'dark' : 'light'
  const [localTheme, setLocalTheme] = useState<ProfileTheme>(initialTheme)

  useEffect(() => {
    setLocalTheme(profile.theme === 'dark' ? 'dark' : 'light')
  }, [profile.theme])

  const activeTheme = previewMode && onThemeChange ? initialTheme : localTheme
  const isDark = activeTheme === 'dark'

  function handleToggleTheme() {
    const next: ProfileTheme = activeTheme === 'dark' ? 'light' : 'dark'
    setLocalTheme(next)
    onThemeChange?.(next)
  }

  const displayName = profile.profile_name?.trim() || qrNumber
  const safeLinks = links.filter((l) => isValidDestinationUrl(l.destination_url))
  const socialLinks = safeLinks.filter((l) => l.platform !== 'custom')
  const customLinks = safeLinks.filter((l) => l.platform === 'custom')

  return (
    <div
      className={`${
        previewMode ? 'min-h-full rounded-[28px]' : 'min-h-screen'
      } flex flex-col justify-between transition-colors duration-200 ${
        isDark ? 'bg-[#111113] text-[#F4F4F2]' : 'bg-[#F7F6F3] text-[#141413]'
      }`}
    >
      <div className={`mx-auto w-full max-w-[440px] ${previewMode ? 'px-5 pt-5 pb-6' : 'px-5 pt-5 sm:pt-8 pb-8'}`}>
        {/* Subtle NFC identity detail + Theme toggle */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono tracking-tight border ${
              isDark
                ? 'border-[#27272B] bg-[#18181B] text-[#8E8E93]'
                : 'border-[#E6E4DF] bg-white/80 text-[#6F6E69]'
            }`}
          >
            <Wifi className={`h-3 w-3 rotate-90 ${isDark ? 'text-[#9D8BF4]' : 'text-[#5E4AE3]'}`} aria-hidden="true" />
            <span>NFC · {qrNumber}</span>
          </span>

          <ThemeToggle theme={activeTheme} onToggle={handleToggleTheme} />
        </div>

        <main>
          <ProfileHeader
            displayName={displayName}
            tagline={profile.tagline}
            avatarId={profile.avatar_id}
            profileImage={profile.profile_image}
            isDark={isDark}
          />

          <ProfileAbout bio={profile.bio} isDark={isDark} />

          <SocialIconGrid links={socialLinks} isDark={isDark} />

          <CustomLinkList links={customLinks} isDark={isDark} />
        </main>
      </div>

      <ProfileFooter isDark={isDark} />
    </div>
  )
}

