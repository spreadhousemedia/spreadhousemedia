import {
  ArrowUpRight,
  Award,
  Building2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Star,
  User,
} from 'lucide-react'
import { formatChannelSubtitle, resolveBusinessTheme } from '../../lib/profileThemes'
import {
  getPlatformMeta,
  isValidContactEmail,
  isValidContactPhone,
  isValidDestinationUrl,
} from '../../lib/validation'
import type { ProfileTheme, PublicLinkItem, PublicProfileData } from '../../types'
import { PlatformIcon } from './PlatformIcons'
import { ProfileFooter } from './ProfileFooter'
import { ThemeToggle } from './ThemeToggle'

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
  if (parts.length === 0) return 'BN'
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
  const theme = resolveBusinessTheme(activeTheme)
  const isDark = theme.isDark
  const isExecutive = theme.layout === 'executive' && Boolean(theme.headerBand)

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

  const quickActions = [
    safePhone
      ? {
          id: 'call',
          label: 'Call',
          href: `tel:${safePhone.replace(/[^\d+]/g, '')}`,
          external: false,
          icon: <Phone className="h-4 w-4 text-emerald-600" aria-hidden="true" />,
        }
      : null,
    primaryWhatsappUrl
      ? {
          id: 'whatsapp',
          label: 'WhatsApp',
          href: primaryWhatsappUrl,
          external: true,
          icon: <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden="true" />,
        }
      : null,
    safeEmail
      ? {
          id: 'email',
          label: 'Email',
          href: `mailto:${safeEmail}`,
          external: false,
          icon: <Mail className="h-4 w-4" style={{ color: theme.accent }} aria-hidden="true" />,
        }
      : null,
    primaryMapsUrl
      ? {
          id: 'maps',
          label: 'Directions',
          href: primaryMapsUrl,
          external: true,
          icon: <Navigation className="h-4 w-4 text-sky-600" aria-hidden="true" />,
        }
      : null,
  ].filter((a): a is NonNullable<typeof a> => Boolean(a))

  return (
    <div
      className={`transition-colors duration-200 ${
        previewMode ? 'min-h-full rounded-[28px]' : 'min-h-screen'
      } flex flex-col justify-between`}
      style={{ backgroundColor: theme.canvas, color: theme.ink }}
    >
      <div
        className={`mx-auto w-full max-w-[440px] ${
          previewMode ? 'px-4 pt-5 pb-8' : 'px-5 pt-6 sm:pt-8 pb-10'
        }`}
      >
        {/* Minimalist Top Bar */}
        <div className="flex items-center justify-between mb-5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-mono tracking-tight"
            style={{
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.muted,
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: theme.accent }} aria-hidden="true" />
            <span>BUSINESS · {qrNumber}</span>
          </span>

          <ThemeToggle theme={isDark ? 'dark' : 'light'} onToggle={onToggleTheme} />
        </div>

        <main className="space-y-6">
          {/* Primary Identity Card */}
          <section
            className="overflow-hidden rounded-3xl border shadow-xs"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            {isExecutive && (
              <div
                className="h-16 w-full"
                style={{ backgroundColor: theme.headerBand }}
                aria-hidden="true"
              />
            )}

            <div className={`px-6 pb-6 ${isExecutive ? '-mt-9' : 'pt-7'}`}>
              <div className={`flex flex-col ${isExecutive ? 'items-start text-left' : 'items-center text-center'}`}>
                {/* Brand Logo Container (supports both square & wide transparent PNG logos cleanly) */}
                {brandLogo ? (
                  <div
                    className="flex h-20 min-w-[84px] max-w-[200px] items-center justify-center overflow-hidden rounded-2xl border bg-white p-2 shadow-2xs"
                    style={{ borderColor: theme.border }}
                  >
                    <img
                      src={brandLogo}
                      alt={`${displayName} logo`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-2xl border shadow-2xs"
                    style={{
                      backgroundColor: theme.subtleSurface,
                      borderColor: theme.border,
                      color: theme.ink,
                    }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xl font-bold tracking-tight leading-none">
                        {initials}
                      </span>
                      <Building2
                        className="mt-1 h-3.5 w-3.5 opacity-60"
                        style={{ color: theme.muted }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                )}

                {/* Category, City, Experience Metadata */}
                {(safeCategory || safeLocation || safeExperience) && (
                  <div
                    className={`mt-4 flex flex-wrap items-center gap-1.5 ${
                      isExecutive ? 'justify-start' : 'justify-center'
                    }`}
                  >
                    {(safeCategory || safeLocation) && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium"
                        style={{
                          backgroundColor: theme.subtleSurface,
                          borderColor: theme.border,
                          color: theme.muted,
                        }}
                      >
                        {safeCategory && <span>{safeCategory}</span>}
                        {safeCategory && safeLocation && <span aria-hidden="true">·</span>}
                        {safeLocation && <span>{safeLocation}</span>}
                      </span>
                    )}

                    {safeExperience && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                        style={{
                          backgroundColor: theme.subtleSurface,
                          borderColor: theme.border,
                          color: theme.ink,
                        }}
                      >
                        <Award className="h-3 w-3 opacity-75" style={{ color: theme.accent }} aria-hidden="true" />
                        <span>{safeExperience}</span>
                      </span>
                    )}
                  </div>
                )}

                <h1
                  className="mt-3.5 max-w-full break-words text-[26px] sm:text-[30px] font-bold tracking-[-0.025em] leading-[1.15]"
                  style={{ color: theme.ink }}
                >
                  {displayName}
                </h1>

                {safeTagline && (
                  <p
                    className="mt-2 max-w-[36ch] break-words text-[14px] font-normal leading-relaxed"
                    style={{ color: theme.muted }}
                  >
                    {safeTagline}
                  </p>
                )}

                {safeHours && (
                  <div
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium"
                    style={{
                      backgroundColor: theme.subtleSurface,
                      borderColor: theme.border,
                      color: theme.muted,
                    }}
                  >
                    <Clock className="h-3 w-3 shrink-0" style={{ color: theme.accent }} aria-hidden="true" />
                    <span>{safeHours}</span>
                  </div>
                )}
              </div>

              {/* Deduplicated Primary Contact Actions */}
              {quickActions.length > 0 && (
                <div
                  className={`mt-6 pt-5 border-t grid gap-2.5 ${
                    quickActions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}
                  style={{ borderColor: theme.border }}
                >
                  {quickActions.map((act) => (
                    <a
                      key={act.id}
                      href={act.href}
                      target={act.external ? '_blank' : undefined}
                      rel={act.external ? 'noopener noreferrer' : undefined}
                      className="flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-xs font-semibold transition-opacity hover:opacity-85 active:scale-[0.99]"
                      style={{
                        backgroundColor: theme.subtleSurface,
                        borderColor: theme.border,
                        color: theme.ink,
                      }}
                    >
                      {act.icon}
                      <span>{act.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Google Reviews Card */}
          {reviewLinks.map((rev) => (
            <a
              key={rev.id}
              href={rev.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-2xl border p-4 sm:p-5 transition-opacity hover:opacity-90"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.ink,
              }}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{ backgroundColor: theme.subtleSurface, borderColor: theme.border }}
                >
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{rev.link_title}</p>
                  <p className="text-xs truncate" style={{ color: theme.muted }}>
                    Share your experience on Google
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          ))}

          {/* About Our Business Card */}
          {(safeBio || safeContactPerson) && (
            <section
              className="rounded-2xl border p-5 sm:p-6 space-y-3"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <h2
                className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em]"
                style={{ color: theme.muted }}
              >
                About
              </h2>
              {safeBio && (
                <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: theme.ink }}>
                  {safeBio}
                </p>
              )}
              {safeContactPerson && (
                <div
                  className="pt-3 border-t flex items-center gap-2 text-xs font-medium"
                  style={{ borderColor: theme.border, color: theme.muted }}
                >
                  <User className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accent }} aria-hidden="true" />
                  <span>Contact: {safeContactPerson}</span>
                </div>
              )}
            </section>
          )}

          {/* Spacious Full-Width Named Social Media & Official Channels */}
          {socialLinks.length > 0 && (
            <section className="space-y-3" aria-label="Connect With Us">
              <h2
                className="px-1 text-[11px] font-mono font-semibold uppercase tracking-[0.14em]"
                style={{ color: theme.muted }}
              >
                Social &amp; Channels
              </h2>
              <div className="space-y-2.5">
                {socialLinks.map((link) => {
                  const meta = getPlatformMeta(link.platform)
                  const subtitle = formatChannelSubtitle(link.destination_url, link.platform)
                  return (
                    <a
                      key={link.id}
                      href={link.destination_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-3.5 rounded-2xl border px-4 py-3.5 transition-opacity hover:opacity-90 active:scale-[0.99]"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        color: theme.ink,
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                          style={{
                            backgroundColor: theme.subtleSurface,
                            borderColor: theme.border,
                          }}
                        >
                          <PlatformIcon platform={link.platform} size={20} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-tight">
                            {meta.label}
                          </p>
                          <p
                            className="mt-0.5 truncate text-xs leading-tight"
                            style={{ color: theme.muted }}
                          >
                            {subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                        style={{ color: theme.muted }}
                        aria-hidden="true"
                      />
                    </a>
                  )
                })}
              </div>
            </section>
          )}

          {/* Featured Business Services / Catalog / Custom Links */}
          {featuredCustomLinks.length > 0 && (
            <section className="space-y-3" aria-label="Business Links">
              <h2
                className="px-1 text-[11px] font-mono font-semibold uppercase tracking-[0.14em]"
                style={{ color: theme.muted }}
              >
                Links &amp; Resources
              </h2>
              <div className="space-y-2.5">
                {featuredCustomLinks.map((link) => {
                  const subtitle = formatChannelSubtitle(link.destination_url, link.platform)
                  return (
                    <a
                      key={link.id}
                      href={link.destination_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-3.5 rounded-2xl border px-4 py-3.5 transition-opacity hover:opacity-90 active:scale-[0.99]"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        color: theme.ink,
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                          style={{
                            backgroundColor: theme.subtleSurface,
                            borderColor: theme.border,
                            color: theme.accent,
                          }}
                        >
                          <PlatformIcon platform="custom" customIcon={link.icon} size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-tight">
                            {link.link_title}
                          </p>
                          <p
                            className="mt-0.5 truncate text-xs leading-tight"
                            style={{ color: theme.muted }}
                          >
                            {subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                        style={{ color: theme.muted }}
                        aria-hidden="true"
                      />
                    </a>
                  )
                })}
              </div>
            </section>
          )}

          {/* Visit & Business Timings Card */}
          {(safeAddress || safeHours) && (
            <section
              className="rounded-2xl border p-5 sm:p-6 space-y-3.5 text-xs"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              aria-label="Location and Business Timings"
            >
              <h2
                className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em]"
                style={{ color: theme.muted }}
              >
                Visit &amp; Timings
              </h2>
              {safeAddress && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: theme.accent }} aria-hidden="true" />
                  <span className="leading-relaxed" style={{ color: theme.ink }}>
                    {safeAddress}
                  </span>
                </div>
              )}
              {safeHours && (
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: theme.accent }} aria-hidden="true" />
                  <span className="leading-relaxed font-medium" style={{ color: theme.ink }}>
                    {safeHours}
                  </span>
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
