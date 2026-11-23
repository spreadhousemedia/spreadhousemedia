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

  const hasQuickActions = Boolean(safePhone || primaryWhatsappUrl || safeEmail || primaryMapsUrl)

  return (
    <div
      className={`relative overflow-hidden transition-colors duration-300 ${
        previewMode ? 'min-h-full rounded-[28px]' : 'min-h-screen'
      } flex flex-col justify-between ${
        isDark
          ? 'bg-[#060913] text-slate-100'
          : 'bg-gradient-to-b from-[#EEF3FF] via-[#F7F9FF] to-[#EEF2FF] text-slate-900'
      }`}
    >
      {/* Glowing Ambient Business Aura */}
      <div
        className={`pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full blur-3xl ${
          isDark ? 'bg-indigo-500/25' : 'bg-indigo-400/25'
        }`}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute top-40 -right-24 h-64 w-64 rounded-full blur-3xl ${
          isDark ? 'bg-cyan-500/15' : 'bg-sky-300/25'
        }`}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute bottom-12 -left-24 h-64 w-64 rounded-full blur-3xl ${
          isDark ? 'bg-emerald-500/10' : 'bg-violet-300/20'
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
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-mono tracking-tight border backdrop-blur-md ${
              isDark
                ? 'border-indigo-400/25 bg-[#0E1629]/85 text-indigo-200 shadow-[0_0_20px_-6px_rgba(99,102,241,0.5)]'
                : 'border-indigo-200 bg-white/85 text-indigo-900 shadow-[0_4px_16px_-6px_rgba(79,70,229,0.22)]'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            <span>OFFICIAL BUSINESS · {qrNumber}</span>
          </span>

          <ThemeToggle theme={activeTheme} onToggle={onToggleTheme} />
        </div>

        <main className="space-y-4">
          {/* Glowing Business Storefront Hero Card */}
          <section
            className={`relative overflow-hidden rounded-3xl border p-5 sm:p-6 backdrop-blur-xl transition-all ${
              isDark
                ? 'border-indigo-400/25 bg-gradient-to-b from-[#111A30]/95 via-[#0B1222]/95 to-[#090F1D]/95 shadow-[0_0_48px_-14px_rgba(99,102,241,0.48),inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'border-indigo-200/80 bg-white/90 shadow-[0_14px_45px_-14px_rgba(79,70,229,0.28),inset_0_1px_0_rgba(255,255,255,0.9)]'
            }`}
          >
            {/* Subtle luminous top highlight line */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-cyan-400 opacity-80"
              aria-hidden="true"
            />

            <div className="flex flex-col items-center text-center">
              {/* Brand Logo or Executive Monogram Emblem */}
              <div className="relative">
                <div
                  className={`absolute -inset-2 rounded-[26px] blur-lg opacity-70 ${
                    isDark
                      ? 'bg-gradient-to-tr from-indigo-500/45 via-violet-500/35 to-cyan-400/40'
                      : 'bg-gradient-to-tr from-indigo-400/35 via-sky-400/30 to-violet-400/35'
                  }`}
                  aria-hidden="true"
                />
                <div
                  className={`relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-[22px] border ${
                    isDark
                      ? 'border-indigo-300/30 bg-[#0D1528] shadow-[0_8px_30px_-8px_rgba(99,102,241,0.6)]'
                      : 'border-indigo-200 bg-white shadow-[0_8px_28px_-8px_rgba(79,70,229,0.3)]'
                  }`}
                >
                  {brandLogo ? (
                    <img
                      src={brandLogo}
                      alt={`${displayName} logo`}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-white">
                      <span className="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-none">
                        {initials}
                      </span>
                      <Building2 className="mt-1 h-3.5 w-3.5 opacity-80" aria-hidden="true" />
                    </div>
                  )}
                </div>
              </div>

              {/* Category, City, Experience Metadata */}
              {(safeCategory || safeLocation || safeExperience) && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {(safeCategory || safeLocation) && (
                    <span
                      className={`inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        isDark
                          ? 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200'
                          : 'border-indigo-200 bg-indigo-50 text-indigo-900'
                      }`}
                    >
                      {safeCategory && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-indigo-400" aria-hidden="true" />
                          <span>{safeCategory}</span>
                        </span>
                      )}
                      {safeCategory && safeLocation && <span aria-hidden="true">·</span>}
                      {safeLocation && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-400" aria-hidden="true" />
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
                      <Award className="h-3 w-3 text-amber-400" aria-hidden="true" />
                      <span>{safeExperience}</span>
                    </span>
                  )}
                </div>
              )}

              <h1
                className={`mt-3 max-w-full break-words text-[26px] sm:text-[32px] font-extrabold tracking-[-0.025em] leading-[1.12] ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {displayName}
              </h1>

              {safeTagline && (
                <p
                  className={`mt-1.5 max-w-[36ch] break-words text-[14px] font-medium leading-snug ${
                    isDark ? 'text-indigo-200/80' : 'text-slate-600'
                  }`}
                >
                  {safeTagline}
                </p>
              )}

              {safeHours && (
                <div
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
                    isDark
                      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{safeHours}</span>
                </div>
              )}
            </div>

            {/* Deduplicated Primary Contact Actions */}
            {hasQuickActions && (
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {safePhone && (
                  <a
                    href={`tel:${safePhone.replace(/[^\d+]/g, '')}`}
                    className={`group flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-bold transition-all ${
                      isDark
                        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:shadow-[0_0_24px_-6px_rgba(16,185,129,0.65)]'
                        : 'border-emerald-200 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100 shadow-xs'
                    }`}
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
                    className={`group flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-bold transition-all ${
                      isDark
                        ? 'border-[#25D366]/35 bg-[#25D366]/12 text-[#86EFAC] hover:bg-[#25D366]/22 hover:shadow-[0_0_24px_-6px_rgba(37,211,102,0.7)]'
                        : 'border-emerald-200 bg-white text-emerald-900 hover:border-[#25D366] shadow-[0_4px_14px_-6px_rgba(37,211,102,0.35)]'
                    }`}
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden="true" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {safeEmail && (
                  <a
                    href={`mailto:${safeEmail}`}
                    className={`group flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-bold transition-all ${
                      isDark
                        ? 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 hover:shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)]'
                        : 'border-indigo-200 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100'
                    }`}
                  >
                    <Mail className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                    <span>Email Us</span>
                  </a>
                )}

                {primaryMapsUrl && (
                  <a
                    href={primaryMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-bold transition-all ${
                      isDark
                        ? 'border-sky-400/25 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 hover:shadow-[0_0_24px_-6px_rgba(56,189,248,0.6)]'
                        : 'border-sky-200 bg-sky-50/80 text-sky-900 hover:bg-sky-100'
                    }`}
                  >
                    <Navigation className="h-4 w-4 text-sky-400" aria-hidden="true" />
                    <span>Directions</span>
                  </a>
                )}
              </div>
            )}
          </section>

          {/* Featured Google Reviews Banner */}
          {reviewLinks.map((rev) => (
            <a
              key={rev.id}
              href={rev.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                isDark
                  ? 'border-amber-400/35 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/15 text-amber-100 shadow-[0_0_32px_-12px_rgba(251,191,36,0.55)] hover:border-amber-300/60'
                  : 'border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 text-amber-950 shadow-[0_10px_28px_-12px_rgba(245,158,11,0.45)] hover:border-amber-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400">
                  <Star className="h-5 w-5 fill-amber-400" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{rev.link_title}</p>
                  <p className={`text-[11px] ${isDark ? 'text-amber-200/75' : 'text-amber-800/80'}`}>
                    Tap to share your experience on Google
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          ))}

          {/* About The Business Card */}
          {(safeBio || safeContactPerson) && (
            <section
              className={`rounded-2xl border p-4 sm:p-5 backdrop-blur-md space-y-2.5 ${
                isDark
                  ? 'border-white/10 bg-[#0D1426]/85 text-slate-200'
                  : 'border-indigo-100 bg-white/90 text-slate-700 shadow-xs'
              }`}
            >
              <h2
                className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                  isDark ? 'text-indigo-300' : 'text-indigo-600'
                }`}
              >
                About Our Business
              </h2>
              {safeBio && <p className="text-[14px] leading-relaxed whitespace-pre-line">{safeBio}</p>}
              {safeContactPerson && (
                <div
                  className={`pt-2 border-t flex items-center gap-2 text-xs font-medium ${
                    isDark ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-600'
                  }`}
                >
                  <User className="h-3.5 w-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
                  <span>Contact Person: {safeContactPerson}</span>
                </div>
              )}
            </section>
          )}

          {/* Business Social Media & Website Channels (With Labels) */}
          {socialLinks.length > 0 && (
            <section
              className={`rounded-2xl border p-4 sm:p-5 backdrop-blur-md space-y-3 ${
                isDark
                  ? 'border-white/10 bg-[#0D1426]/85'
                  : 'border-indigo-100 bg-white/90 shadow-xs'
              }`}
              aria-label="Business Social Media Channels"
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                    isDark ? 'text-cyan-300' : 'text-indigo-600'
                  }`}
                >
                  Connect With Us
                </h2>
                <Globe className={`h-3.5 w-3.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} aria-hidden="true" />
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
                      className={`group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all ${
                        isDark
                          ? 'border-white/10 bg-white/[0.03] text-slate-100 hover:border-indigo-400/45 hover:bg-indigo-500/10 hover:shadow-[0_0_20px_-8px_rgba(99,102,241,0.55)]'
                          : 'border-slate-200 bg-slate-50/70 text-slate-900 hover:border-indigo-300 hover:bg-white shadow-2xs'
                      }`}
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
                      ? 'border-indigo-400/20 bg-[#0E1629]/90 text-white hover:border-indigo-400/55 hover:shadow-[0_0_28px_-10px_rgba(99,102,241,0.65)]'
                      : 'border-indigo-100 bg-white/95 text-slate-900 shadow-xs hover:border-indigo-300 hover:shadow-[0_10px_28px_-12px_rgba(79,70,229,0.28)]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isDark ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
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
              className={`rounded-2xl border p-4 sm:p-5 backdrop-blur-md space-y-3 text-xs ${
                isDark
                  ? 'border-white/10 bg-[#0D1426]/85 text-slate-300'
                  : 'border-indigo-100 bg-white/90 text-slate-700 shadow-xs'
              }`}
              aria-label="Business Location and Timings"
            >
              <h2
                className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                  isDark ? 'text-emerald-300' : 'text-emerald-700'
                }`}
              >
                Visit &amp; Business Timings
              </h2>
              {safeAddress && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span className="leading-relaxed">{safeAddress}</span>
                </div>
              )}
              {safeHours && (
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0 text-indigo-400" aria-hidden="true" />
                  <span className="leading-relaxed font-medium">{safeHours}</span>
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

