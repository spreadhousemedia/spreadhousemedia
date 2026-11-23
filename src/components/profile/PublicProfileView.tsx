import { useEffect, useState } from 'react'
import { Clock, Mail, MapPin, MessageCircle, Navigation, Phone, Wifi } from 'lucide-react'
import type { ProfileTheme, PublicLinkItem, PublicProfileData } from '../../types'
import { isValidContactEmail, isValidContactPhone, isValidDestinationUrl } from '../../lib/validation'
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
  const isBusiness = profile.profile_type === 'business'
  const safeLinks = links.filter((l) => isValidDestinationUrl(l.destination_url))
  const socialLinks = safeLinks.filter(
    (l) => l.platform !== 'custom' && l.platform !== 'google_reviews' && l.platform !== 'google_maps',
  )
  const featuredLinks = safeLinks.filter(
    (l) => l.platform === 'custom' || l.platform === 'google_reviews' || l.platform === 'google_maps',
  )

  const safePhone =
    isBusiness && profile.contact_phone?.trim() && isValidContactPhone(profile.contact_phone)
      ? profile.contact_phone.trim()
      : null
  const safeWhatsapp =
    isBusiness && profile.whatsapp_number?.trim() && isValidContactPhone(profile.whatsapp_number)
      ? profile.whatsapp_number.trim()
      : null
  const safeEmail =
    isBusiness && profile.contact_email?.trim() && isValidContactEmail(profile.contact_email)
      ? profile.contact_email.trim()
      : null
  const safeMapsUrl =
    isBusiness && profile.google_maps_url?.trim() && isValidDestinationUrl(profile.google_maps_url)
      ? profile.google_maps_url.trim()
      : null
  const safeAddress = isBusiness && profile.full_address?.trim() ? profile.full_address.trim() : null
  const safeHours = isBusiness && profile.working_hours?.trim() ? profile.working_hours.trim() : null

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
            <span>{isBusiness ? `BUSINESS · ${qrNumber}` : `NFC · ${qrNumber}`}</span>
          </span>

          <ThemeToggle theme={activeTheme} onToggle={handleToggleTheme} />
        </div>

        <main>
          <ProfileHeader
            displayName={displayName}
            profileType={profile.profile_type}
            businessCategory={profile.business_category}
            location={profile.location}
            businessExperience={profile.business_experience}
            contactPersonName={profile.contact_person_name}
            tagline={profile.tagline}
            avatarId={profile.avatar_id}
            profileImage={profile.profile_image}
            isDark={isDark}
          />

          <ProfileAbout bio={profile.bio} isDark={isDark} />

          {(safePhone || safeWhatsapp || safeEmail || safeMapsUrl) && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {safePhone && (
                <a
                  href={`tel:${safePhone.replace(/[^\d+]/g, '')}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold border transition-colors ${
                    isDark
                      ? 'border-[#27272B] bg-[#18181B] text-[#F4F4F2] hover:bg-[#232329]'
                      : 'border-[#E6E4DF] bg-white text-[#141413] hover:border-[#141413]'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Call</span>
                </a>
              )}
              {safeWhatsapp && (
                <a
                  href={`https://wa.me/${safeWhatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold border transition-colors ${
                    isDark
                      ? 'border-[#27272B] bg-[#18181B] text-[#F4F4F2] hover:bg-[#232329]'
                      : 'border-[#E6E4DF] bg-white text-[#141413] hover:border-[#141413]'
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                  <span>WhatsApp</span>
                </a>
              )}
              {safeEmail && (
                <a
                  href={`mailto:${safeEmail}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold border transition-colors ${
                    isDark
                      ? 'border-[#27272B] bg-[#18181B] text-[#F4F4F2] hover:bg-[#232329]'
                      : 'border-[#E6E4DF] bg-white text-[#141413] hover:border-[#141413]'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5 text-[#5E4AE3]" />
                  <span>Email</span>
                </a>
              )}
              {safeMapsUrl && (
                <a
                  href={safeMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold border transition-colors ${
                    isDark
                      ? 'border-[#27272B] bg-[#18181B] text-[#F4F4F2] hover:bg-[#232329]'
                      : 'border-[#E6E4DF] bg-white text-[#141413] hover:border-[#141413]'
                  }`}
                >
                  <Navigation className="h-3.5 w-3.5 text-sky-500" />
                  <span>Directions</span>
                </a>
              )}
            </div>
          )}

          <SocialIconGrid links={socialLinks} isDark={isDark} />

          <CustomLinkList links={featuredLinks} isDark={isDark} />

          {(safeAddress || safeHours) && (
            <section
              className={`mt-6 rounded-2xl border p-4 space-y-2 text-xs ${
                isDark
                  ? 'border-[#27272B] bg-[#18181B] text-[#C8C8C2]'
                  : 'border-[#E6E4DF] bg-white text-[#42413D]'
              }`}
              aria-label="Business Location & Hours"
            >
              {safeAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="leading-relaxed">{safeAddress}</span>
                </div>
              )}
              {safeHours && (
                <div className="flex items-start gap-2">
                  <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#5E4AE3]" aria-hidden="true" />
                  <span className="leading-relaxed">{safeHours}</span>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <ProfileFooter isDark={isDark} />
    </div>
  )
}

