import {
  ArrowUpRight,
  Award,
  Building2,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Star,
  User,
} from 'lucide-react'
import type { ProfileTheme, PublicLinkItem, PublicProfileData } from '../../types'
import {
  getPlatformMeta,
  isValidContactEmail,
  isValidContactPhone,
  isValidDestinationUrl,
} from '../../lib/validation'
import { PlatformIcon } from './PlatformIcons'
import { ThemeToggle } from './ThemeToggle'
import { ProfileFooter } from './ProfileFooter'

interface BusinessStorefrontViewProps {
  profile: PublicProfileData
  links: PublicLinkItem[]
  qrNumber: string
  activeTheme: ProfileTheme
  previewMode?: boolean
  onToggleTheme: () => void
}

function getSafeUploadedLogo(profileImage?: string | null): string | null {
  if (!profileImage) return null
  const trimmed = profileImage.trim()
  // Reject legacy cartoon portrait paths on Business Storefronts; allow real uploaded logos only
  if (/\/avatars\/avatar-\d+/i.test(trimmed)) return null
  if (trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed
  }
  return null
}

function getBusinessInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'SN'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function BusinessStorefrontView({
  profile,
  links,
  qrNumber,
  activeTheme,
  previewMode = false,
  onToggleTheme,
}: BusinessStorefrontViewProps) {
  const isDark = activeTheme === 'dark'
  const displayName = profile.profile_name?.trim() || qrNumber
  const brandLogo = getSafeUploadedLogo(profile.profile_image)
  const initials = getBusinessInitials(displayName)

  const safeCategory = profile.business_category?.trim() || null
  const safeLocation = profile.location?.trim() || null
  const safeExperience = profile.business_experience?.trim() || null
  const safeContactPerson = profile.contact_person_name?.trim() || null
  const safeTagline = profile.tagline?.trim() || null
  const safeBio = profile.bio?.trim() || null
  const safeAddress = profile.full_address?.trim() || null
  const safeHours = profile.working_hours?.trim() || null

  const safePhone =
    profile.contact_phone?.trim() && isValidContactPhone(profile.contact_phone)
      ? profile.contact_phone.trim()
      : null
  const safeEmail =
    profile.contact_email?.trim() && isValidContactEmail(profile.contact_email)
      ? profile.contact_email.trim()
      : null

  const validLinks = links.filter((l) => isValidDestinationUrl(l.destination_url))

  // Resolve single deduplicated WhatsApp destination
  const contactWhatsappUrl =
    profile.whatsapp_number?.trim() && isValidContactPhone(profile.whatsapp_number)
      ? `https://wa.me/${profile.whatsapp_number.trim().replace(/\D/g, '')}`
      : null
  const linkWhatsappItem = validLinks.find((l) => l.platform === 'whatsapp') ?? null
  const primaryWhatsappUrl = contactWhatsappUrl || linkWhatsappItem?.destination_url || null

  // Resolve single deduplicated Directions (Google Maps) destination
  const contactMapsUrl =
    profile.google_maps_url?.trim() && isValidDestinationUrl(profile.google_maps_url)
      ? profile.google_maps_url.trim()
      : null
  const linkMapsItem = validLinks.find((l) => l.platform === 'google_maps') ?? null
  const primaryMapsUrl = contactMapsUrl || linkMapsItem?.destination_url || null

  // Deduplicate remaining channels so WhatsApp / Maps / identical URLs never repeat
  const seenKeys = new Set<string>()
  const dedupedLinks: PublicLinkItem[] = []
  for (const item of validLinks) {
    if (item.platform === 'whatsapp' && primaryWhatsappUrl) continue
    if (item.platform === 'google_maps' && primaryMapsUrl) continue
    const key = `${item.platform}|${item.destination_url.trim().toLowerCase()}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    dedupedLinks.push(item)
  }

  const reviewLinks = dedupedLinks.filter((l) => l.platform === 'google_reviews')
  const socialLinks = dedupedLinks.filter(
    (l) => l.platform !== 'custom' && l.platform !== 'google_reviews' && l.platform !== 'google_maps',
  )
  const featuredCustomLinks = dedupedLinks.filter((l) => l.platform === 'custom')

  const quickActionCount =
    (safePhone ? 1 : 0) +
    (primaryWhatsappUrl ? 1 : 0) +
    (safeEmail ? 1 : 0) +
    (primaryMapsUrl ? 1 : 0)

  const actionTileClass = isDark
    ? 'border-[#A577FF]/20 bg-[#1E1050] text-[#F5F7FC] hover:border-[#A577FF]/50 hover:bg-[#271466]'
    : 'border-[#E2E6F0] bg-[#F5F7FC] text-[#150A35] hover:border-[#7040F0]/50 hover:bg-[#F5F0FF]'

  const sectionCardClass = isDark
    ? 'border-[#A577FF]/20 bg-[#150A35]/95 text-[#F5F7FC] shadow-card-dark'
    : 'border-[#E2E6F0] bg-white text-[#150A35] shadow-editorial'

  return (
    <div
      className={`relative overflow-hidden transition-colors duration-300 ${
        previewMode ? 'min-h-full rounded-[28px]' : 'min-h-screen'
      } flex flex-col justify-between ${
        isDark ? 'bg-[#0D0620] text-[#F5F7FC]' : 'bg-[#F5F7FC] text-[#150A35]'
      }`}
    >
      {/* Single Restrained Top Ambient Wash (Cetacean + Lavender Brand Identity) */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-80 ${
          isDark
            ? 'bg-[radial-gradient(ellipse_80%_45%_at_50%_-8%,rgba(165,119,255,0.22),transparent_70%)]'
            : 'bg-[radial-gradient(ellipse_75%_45%_at_50%_-10%,rgba(165,119,255,0.11),transparent_70%)]'
        }`}
        aria-hidden="true"
      />

      <div
        className={`relative z-10 mx-auto w-full max-w-[460px] ${
          previewMode ? 'px-4 pt-4 pb-6' : 'px-4 sm:px-5 pt-5 sm:pt-8 pb-8'
        }`}
      >
        {/* Top Storefront Bar */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono tracking-tight border ${
              isDark
                ? 'border-[#A577FF]/25 bg-[#150A35]/90 text-[#C4A3FF]'
                : 'border-[#E2E6F0] bg-white text-[#4E4668] shadow-2xs'
            }`}
          >
            <ShieldCheck
              className={`h-3.5 w-3.5 ${isDark ? 'text-[#A577FF]' : 'text-[#7040F0]'}`}
              aria-hidden="true"
            />
            <span>BUSINESS · {qrNumber}</span>
          </span>

          <ThemeToggle theme={activeTheme} onToggle={onToggleTheme} />
        </div>

        <main className="space-y-4">
          {/* Executive Business Hero Card */}
          <section
            className={`relative overflow-hidden rounded-3xl border p-5 sm:p-6 transition-all ${sectionCardClass}`}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A577FF]/70 to-transparent"
              aria-hidden="true"
            />

            <div className="flex flex-col items-center text-center">
              {/* Brand Logo or Cetacean-Lavender Monogram */}
              <div
                className={`relative flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center overflow-hidden rounded-2xl border ${
                  isDark
                    ? 'border-[#A577FF]/35 bg-[#1E1050] shadow-glow-lavender'
                    : 'border-[#E2E6F0] bg-white shadow-editorial'
                }`}
              >
                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt={`${displayName} logo`}
                    width={88}
                    height={88}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#271466] via-[#1E1050] to-[#150A35] text-[#F5F7FC]">
                    <span className="text-2xl font-extrabold tracking-tight leading-none">
                      {initials}
                    </span>
                    <Building2
                      className="mt-1 h-3.5 w-3.5 text-[#C4A3FF]/80"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>

              {/* Category, City & Experience Chips */}
              {(safeCategory || safeLocation || safeExperience) && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {(safeCategory || safeLocation) && (
                    <span
                      className={`inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        isDark
                          ? 'border-[#A577FF]/25 bg-[#1E1050] text-[#E8DEFF]'
                          : 'border-[#E8DEFF] bg-[#F5F0FF] text-[#150A35]'
                      }`}
                    >
                      {safeCategory && (
                        <span className="inline-flex items-center gap-1">
                          <Building2
                            className={`h-3 w-3 ${isDark ? 'text-[#A577FF]' : 'text-[#7040F0]'}`}
                            aria-hidden="true"
                          />
                          <span>{safeCategory}</span>
                        </span>
                      )}
                      {safeCategory && safeLocation && <span aria-hidden="true">·</span>}
                      {safeLocation && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                          <span>{safeLocation}</span>
                        </span>
                      )}
                    </span>
                  )}

                  {safeExperience && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        isDark
                          ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
                          : 'border-amber-200 bg-amber-50 text-amber-900'
                      }`}
                    >
                      <Award className="h-3 w-3 text-amber-500" aria-hidden="true" />
                      <span>{safeExperience}</span>
                    </span>
                  )}
                </div>
              )}

              <h1
                className={`mt-3 max-w-full break-words text-[26px] sm:text-[31px] font-extrabold tracking-[-0.025em] leading-[1.12] ${
                  isDark ? 'text-[#F5F7FC]' : 'text-[#150A35]'
                }`}
              >
                {displayName}
              </h1>

              {safeTagline && (
                <p
                  className={`mt-1.5 max-w-[36ch] break-words text-[14px] font-medium leading-snug ${
                    isDark ? 'text-[#C4A3FF]/85' : 'text-[#4E4668]'
                  }`}
                >
                  {safeTagline}
                </p>
              )}

              {safeHours && (
                <div
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
                    isDark
                      ? 'border-[#A577FF]/20 bg-[#1E1050]/80 text-[#E8DEFF]'
                      : 'border-[#E2E6F0] bg-[#F5F7FC] text-[#4E4668]'
                  }`}
                >
                  <Clock
                    className={`h-3 w-3 shrink-0 ${isDark ? 'text-[#A577FF]' : 'text-[#7040F0]'}`}
                    aria-hidden="true"
                  />
                  <span>{safeHours}</span>
                </div>
              )}
            </div>

            {/* Deduplicated Quick Action Bar */}
            {quickActionCount > 0 && (
              <div
                className={`mt-5 grid gap-2.5 ${
                  quickActionCount === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {safePhone && (
                  <a
                    href={`tel:${safePhone.replace(/[^\d+]/g, '')}`}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-bold transition-all ${actionTileClass}`}
                  >
                    <Phone className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                    <span>Call Business</span>
                  </a>
                )}

                {primaryWhatsappUrl && (
                  <a
                    href={primaryWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-bold transition-all ${actionTileClass}`}
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden="true" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {safeEmail && (
                  <a
                    href={`mailto:${safeEmail}`}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-bold transition-all ${actionTileClass}`}
                  >
                    <Mail
                      className={`h-4 w-4 ${isDark ? 'text-[#A577FF]' : 'text-[#7040F0]'}`}
                      aria-hidden="true"
                    />
                    <span>Email Us</span>
                  </a>
                )}

                {primaryMapsUrl && (
                  <a
                    href={primaryMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-bold transition-all ${actionTileClass}`}
                  >
                    <Navigation className="h-4 w-4 text-sky-500" aria-hidden="true" />
                    <span>Directions</span>
                  </a>
                )}
              </div>
            )}
          </section>

          {/* Google Reviews Highlight Banner */}
          {reviewLinks.map((rev) => (
            <a
              key={rev.id}
              href={rev.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                isDark
                  ? 'border-amber-400/30 bg-[#150A35] text-[#F5F7FC] shadow-card-dark hover:border-amber-400/55'
                  : 'border-amber-200 bg-amber-50/50 text-[#150A35] shadow-editorial hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isDark ? 'bg-amber-400/15 text-amber-400' : 'bg-amber-100 text-amber-500'
                  }`}
                >
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{rev.link_title}</p>
                  <p className={`text-[11px] ${isDark ? 'text-[#C4A3FF]/75' : 'text-[#6B6480]'}`}>
                    Tap to share your review on Google
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </a>
          ))}

          {/* About Our Business Card */}
          {(safeBio || safeContactPerson) && (
            <section className={`rounded-2xl border p-4 sm:p-5 space-y-2.5 ${sectionCardClass}`}>
              <h2
                className={`text-[11px] font-mono font-bold uppercase tracking-[0.14em] ${
                  isDark ? 'text-[#C4A3FF]' : 'text-[#7040F0]'
                }`}
              >
                About Our Business
              </h2>
              {safeBio && (
                <p
                  className={`text-[14px] leading-relaxed whitespace-pre-line ${
                    isDark ? 'text-[#EEF1F8]' : 'text-[#4E4668]'
                  }`}
                >
                  {safeBio}
                </p>
              )}
              {safeContactPerson && (
                <div
                  className={`pt-2.5 border-t flex items-center gap-2 text-xs font-medium ${
                    isDark
                      ? 'border-[#A577FF]/15 text-[#C4A3FF]'
                      : 'border-[#E2E6F0] text-[#6B6480]'
                  }`}
                >
                  <User
                    className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-[#A577FF]' : 'text-[#7040F0]'}`}
                    aria-hidden="true"
                  />
                  <span>Contact Person: {safeContactPerson}</span>
                </div>
              )}
            </section>
          )}

          {/* Business Social Media & Website Channels (Labeled Tiles) */}
          {socialLinks.length > 0 && (
            <section
              className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${sectionCardClass}`}
              aria-label="Business Social Media Channels"
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`text-[11px] font-mono font-bold uppercase tracking-[0.14em] ${
                    isDark ? 'text-[#C4A3FF]' : 'text-[#7040F0]'
                  }`}
                >
                  Connect With Us
                </h2>
                <Globe
                  className={`h-3.5 w-3.5 ${isDark ? 'text-[#A577FF]/70' : 'text-[#6B6480]'}`}
                  aria-hidden="true"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {socialLinks.map((link) => {
                  const meta = getPlatformMeta(link.platform)
                  return (
                    <a
                      key={link.id}
                      href={link.destination_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all ${actionTileClass}`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <PlatformIcon platform={link.platform} size={18} />
                        <span className="truncate text-xs font-semibold">{meta.label}</span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
                    </a>
                  )
                })}
              </div>
            </section>
          )}

          {/* Featured Business Services / Catalog / Custom Links */}
          {featuredCustomLinks.length > 0 && (
            <section className="space-y-2.5" aria-label="Business Services and Resources">
              {featuredCustomLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-all ${
                    isDark
                      ? 'border-[#A577FF]/20 bg-[#150A35] text-[#F5F7FC] shadow-card-dark hover:border-[#A577FF]/50 hover:bg-[#1E1050]'
                      : 'border-[#E2E6F0] bg-white text-[#150A35] shadow-editorial hover:border-[#7040F0]/45 hover:bg-[#FAFBFD]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isDark ? 'bg-[#1E1050] text-[#C4A3FF]' : 'bg-[#F5F0FF] text-[#7040F0]'
                      }`}
                    >
                      <PlatformIcon platform="custom" customIcon={link.icon} size={18} />
                    </span>
                    <span className="truncate text-sm font-semibold">{link.link_title}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </a>
              ))}
            </section>
          )}

          {/* Visit & Business Timings Card */}
          {(safeAddress || safeHours) && (
            <section
              className={`rounded-2xl border p-4 sm:p-5 space-y-3 text-xs ${sectionCardClass}`}
              aria-label="Business Location and Timings"
            >
              <h2
                className={`text-[11px] font-mono font-bold uppercase tracking-[0.14em] ${
                  isDark ? 'text-[#C4A3FF]' : 'text-[#7040F0]'
                }`}
              >
                Visit &amp; Business Timings
              </h2>
              {safeAddress && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span className={`leading-relaxed ${isDark ? 'text-[#EEF1F8]' : 'text-[#4E4668]'}`}>
                    {safeAddress}
                  </span>
                </div>
              )}
              {safeHours && (
                <div className="flex items-start gap-2.5">
                  <Clock
                    className={`h-4 w-4 mt-0.5 shrink-0 ${isDark ? 'text-[#A577FF]' : 'text-[#7040F0]'}`}
                    aria-hidden="true"
                  />
                  <span className={`leading-relaxed font-medium ${isDark ? 'text-[#F5F7FC]' : 'text-[#150A35]'}`}>
                    {safeHours}
                  </span>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <div className="relative z-10">
        <ProfileFooter isDark={isDark} />
      </div>
    </div>
  )
}
