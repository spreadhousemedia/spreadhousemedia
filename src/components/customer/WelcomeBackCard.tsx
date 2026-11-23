import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  ExternalLink,
  Layers,
  LogOut,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import { profilePublicUrl, qrPublicUrl } from '../../lib/config'
import { getBusinessPurposeLabel } from '../../lib/validation'
import { resolveProfileAvatarSrc } from '../../lib/avatars'
import type { CustomerDashboardData } from '../../types'
import { PlatformIcon } from '../profile/PlatformIcons'

interface WelcomeBackCardProps {
  dashboard: CustomerDashboardData
  multiQrCount: number
  onProceedToEditor: () => void
  onOpenMultiQr: () => void
  onLogout: () => void
}

export function WelcomeBackCard({
  dashboard,
  multiQrCount,
  onProceedToEditor,
  onOpenMultiQr,
  onLogout,
}: WelcomeBackCardProps) {
  const { qr, profile, links } = dashboard
  const mode = qr.usage_type
  const activeLinks = links.filter((l) => l.is_active)

  const avatarSrc = resolveProfileAvatarSrc(profile?.avatar_id, profile?.profile_image)
  const publicUrl =
    mode === 'personal' || mode === 'business_profile'
      ? profilePublicUrl(profile?.public_slug || qr.qr_number)
      : qrPublicUrl(qr.qr_number)

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-surface-border bg-white p-6 sm:p-8 shadow-xl relative z-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" />
          Welcome Back · {qr.qr_number}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Welcome Back!
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
          Your QR is already configured. We&apos;ve detected your setup and prepared the right editor for you.
        </p>
      </div>

      {/* Case 1: Personal Profile */}
      {mode === 'personal' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile?.profile_name || qr.qr_number}
                  className="h-14 w-14 rounded-2xl object-cover border border-emerald-200 bg-white"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <User className="h-6 w-6" />
                </span>
              )}
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                  Detected · Personal Profile
                </p>
                <h2 className="text-lg font-bold text-ink">
                  {profile?.profile_name || qr.qr_name}
                </h2>
                {profile?.tagline && (
                  <p className="text-xs text-ink-muted">{profile.tagline}</p>
                )}
              </div>
            </div>

            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                profile?.is_published
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              {profile?.is_published ? 'Published' : 'Draft'}
            </span>
          </div>

          {activeLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeLinks.slice(0, 6).map((l) => (
                <span
                  key={l.id}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-emerald-200/80 shadow-2xs"
                  title={l.link_title}
                >
                  <PlatformIcon platform={l.platform} customIcon={l.icon} size={16} />
                </span>
              ))}
              {activeLinks.length > 6 && (
                <span className="text-xs font-semibold text-emerald-800">
                  +{activeLinks.length - 6} more
                </span>
              )}
            </div>
          )}

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-ink-secondary">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Update name, bio or avatar</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Add / remove social &amp; custom links</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Switch Light &amp; Dark theme</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Live preview &amp; instant publish</span>
            </li>
          </ul>
        </div>
      )}

      {/* Case 2: Business Direct Link */}
      {mode === 'business' && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shrink-0">
                <Zap className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-700">
                  Detected · Business Direct Link
                </p>
                <h2 className="text-lg font-bold text-ink">
                  {qr.business_name || qr.qr_name}
                </h2>
                <p className="text-xs text-ink-muted">
                  Purpose: {getBusinessPurposeLabel(qr.business_purpose)} · {qr.scan_count} scans
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-white p-3.5 space-y-1">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
              Current Active Redirect URL
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-ink truncate">
                {qr.destination_url || 'Not configured yet'}
              </span>
              {qr.destination_url && (
                <a
                  href={qr.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 hover:text-sky-700 shrink-0"
                  title="Open destination"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-ink-secondary">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
              <span>Change the destination URL</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
              <span>Select category (Reviews, Website, etc.)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
              <span>Test the live link</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
              <span>Save and activate instantly</span>
            </li>
          </ul>
        </div>
      )}

      {/* Case 3: Business Profile */}
      {mode === 'business_profile' && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile?.profile_name || qr.business_name || qr.qr_number}
                  className="h-14 w-14 rounded-2xl object-cover border border-indigo-200 bg-white"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-electric text-white">
                  <Briefcase className="h-6 w-6" />
                </span>
              )}
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-electric">
                  Detected · Business Profile
                </p>
                <h2 className="text-lg font-bold text-ink">
                  {profile?.profile_name || qr.business_name || qr.qr_name}
                </h2>
                <p className="text-xs text-ink-muted">
                  {[profile?.business_category, profile?.location].filter(Boolean).join(' · ') ||
                    `${activeLinks.length} active business links`}
                </p>
              </div>
            </div>

            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                profile?.is_published
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              {profile?.is_published ? 'Published' : 'Draft'}
            </span>
          </div>

          {activeLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeLinks.slice(0, 6).map((l) => (
                <span
                  key={l.id}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-indigo-200/80 shadow-2xs"
                  title={l.link_title}
                >
                  <PlatformIcon platform={l.platform} customIcon={l.icon} size={16} />
                </span>
              ))}
              {activeLinks.length > 6 && (
                <span className="text-xs font-semibold text-electric">
                  +{activeLinks.length - 6} more
                </span>
              )}
            </div>
          )}

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-ink-secondary">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-electric shrink-0" />
              <span>Update business details &amp; logo</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-electric shrink-0" />
              <span>Manage Google Reviews &amp; Maps</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-electric shrink-0" />
              <span>Add &amp; reorder multiple links</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-electric shrink-0" />
              <span>Preview &amp; save changes</span>
            </li>
          </ul>
        </div>
      )}

      {/* Primary Action + Multi-QR Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onProceedToEditor}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 shadow-md transition-all"
        >
          <span>
            {mode === 'personal'
              ? 'Go to Personal Profile Editor'
              : mode === 'business'
                ? 'Update Destination'
                : 'Go to Business Profile Editor'}
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onOpenMultiQr}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-surface-border bg-white px-4 py-3.5 text-xs font-bold text-ink hover:bg-zinc-50 transition-colors"
        >
          <Layers className="h-4 w-4 text-amber-600" />
          <span>Multi-QR Manager{multiQrCount > 1 ? ` (${multiQrCount})` : ''}</span>
        </button>
      </div>

      {/* Footer status */}
      <div className="pt-3 border-t border-surface-border flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Session Active
          </span>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-electric hover:underline font-medium"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Open Live QR</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1 text-ink-muted hover:text-ink font-medium"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}

