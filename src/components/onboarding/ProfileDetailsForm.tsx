import { useEffect, useState } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { checkPublicSlugAvailable } from '../../lib/profileApi'
import { isValidPublicSlug, normalizePublicSlug } from '../../lib/validation'

const TAGLINE_SUGGESTIONS = [
  'Entrepreneur',
  'Digital Creator',
  'Designer',
  'Developer',
  'Photographer',
  'Business Professional',
]

interface ProfileDetailsFormProps {
  qrNumber: string
  sessionToken: string
  displayName: string
  tagline: string
  bio: string
  publicSlug: string
  onChange: (patch: {
    displayName?: string
    tagline?: string
    bio?: string
    publicSlug?: string
  }) => void
  onContinue: () => void
}

export function ProfileDetailsForm({
  qrNumber,
  sessionToken,
  displayName,
  tagline,
  bio,
  publicSlug,
  onChange,
  onContinue,
}: ProfileDetailsFormProps) {
  const [nameError, setNameError] = useState<string | null>(null)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')

  const cleanSlug = publicSlug.trim() ? normalizePublicSlug(publicSlug) : ''

  useEffect(() => {
    if (!cleanSlug) {
      setSlugStatus('idle')
      return
    }
    if (!isValidPublicSlug(cleanSlug)) {
      setSlugStatus('invalid')
      return
    }

    let cancelled = false
    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      const res = await checkPublicSlugAvailable(sessionToken, cleanSlug)
      if (cancelled) return
      if (!res.checked) {
        setSlugStatus('idle')
        return
      }
      if (res.available) {
        setSlugStatus('available')
      } else {
        setSlugStatus(res.reason === 'invalid_slug' ? 'invalid' : 'taken')
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [cleanSlug, sessionToken])

  function handleContinue() {
    const cleanName = displayName.trim()
    if (!cleanName || cleanName.length > 80) {
      setNameError('Please enter your display name (1–80 characters).')
      return
    }
    if (cleanSlug && (!isValidPublicSlug(cleanSlug) || slugStatus === 'invalid')) {
      return
    }
    if (slugStatus === 'taken') {
      return
    }
    onContinue()
  }

  const previewIdentifier = cleanSlug || qrNumber

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.025em] leading-[1.15] text-[#141413]">
          Add profile details
        </h1>
        <p className="mt-2 text-[15px] text-[#5C5B57] leading-relaxed">
          This information will be visible to people who scan your QR code.
        </p>
      </div>

      <div className="space-y-5">
        {/* A. Display Name (Required) */}
        <div className="space-y-1.5">
          <label htmlFor="onb-display-name" className="block text-[13px] font-semibold text-[#141413]">
            Display Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="onb-display-name"
            value={displayName}
            onChange={(e) => {
              onChange({ displayName: e.target.value })
              if (nameError) setNameError(null)
            }}
            maxLength={80}
            placeholder="Brijesh Sharma"
            className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-[15px] text-[#141413] placeholder:text-[#9E9C96] focus:outline-none transition-colors ${
              nameError ? 'border-rose-400 focus:border-rose-500' : 'border-[#E6E4DF] focus:border-[#141413]'
            }`}
          />
          {nameError && (
            <p role="alert" className="text-[12px] font-medium text-rose-600 px-1">
              {nameError}
            </p>
          )}
        </div>

        {/* B. Professional Tagline (Optional) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="onb-tagline" className="text-[13px] font-semibold text-[#141413]">
              Professional Tagline
            </label>
            <span className="text-[12px] text-[#6F6E69]">Optional</span>
          </div>
          <input
            id="onb-tagline"
            value={tagline}
            onChange={(e) => onChange({ tagline: e.target.value })}
            maxLength={80}
            placeholder="e.g. Digital Creator, Founder, Designer"
            className="w-full rounded-2xl border border-[#E6E4DF] bg-white px-4 py-3.5 text-[15px] text-[#141413] placeholder:text-[#9E9C96] focus:border-[#141413] focus:outline-none transition-colors"
          />
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {TAGLINE_SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onChange({ tagline: item })}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  tagline.trim() === item
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : 'border-[#E6E4DF] bg-white text-[#5C5B57] hover:border-[#CBC8C0] hover:text-[#141413]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* C. About (Optional, max 160 chars) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="onb-about" className="text-[13px] font-semibold text-[#141413]">
              About
            </label>
            <span className="font-mono text-[11px] text-[#6F6E69]">
              {bio.length}/160
            </span>
          </div>
          <textarea
            id="onb-about"
            rows={3}
            maxLength={160}
            value={bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="Tell people a little about yourself..."
            className="w-full rounded-2xl border border-[#E6E4DF] bg-white px-4 py-3 text-[15px] leading-relaxed text-[#141413] placeholder:text-[#9E9C96] focus:border-[#141413] focus:outline-none resize-none transition-colors"
          />
        </div>

        {/* D. Public Username (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="onb-slug" className="text-[13px] font-semibold text-[#141413]">
              Public Username
            </label>
            <span className="text-[12px] text-[#6F6E69]">Optional</span>
          </div>

          <div
            className={`flex items-center overflow-hidden rounded-2xl border bg-white transition-colors ${
              slugStatus === 'invalid' || slugStatus === 'taken'
                ? 'border-rose-400 focus-within:border-rose-500'
                : 'border-[#E6E4DF] focus-within:border-[#141413]'
            }`}
          >
            <span className="border-r border-[#E6E4DF] bg-[#FAF9F7] px-3.5 py-3.5 font-mono text-[13px] text-[#6F6E69] shrink-0">
              spreadnfc.in/p/
            </span>
            <input
              id="onb-slug"
              value={publicSlug}
              onChange={(e) => onChange({ publicSlug: normalizePublicSlug(e.target.value) })}
              maxLength={40}
              placeholder={qrNumber.toLowerCase()}
              className="w-full bg-transparent px-3 py-3.5 font-mono text-[14px] text-[#141413] placeholder:text-[#9E9C96] focus:outline-none"
            />
            {slugStatus === 'checking' && (
              <Loader2 className="mr-3 h-4 w-4 animate-spin text-[#6F6E69] shrink-0" />
            )}
            {slugStatus === 'available' && cleanSlug && (
              <Check className="mr-3 h-4 w-4 text-emerald-600 shrink-0" />
            )}
          </div>

          {slugStatus === 'invalid' ? (
            <p role="alert" className="text-[12px] font-medium text-rose-600 px-1">
              Use 3–40 lowercase letters, numbers, hyphens, or underscores (no reserved words).
            </p>
          ) : slugStatus === 'taken' ? (
            <p role="alert" className="text-[12px] font-medium text-rose-600 px-1">
              This username is already taken. Try another one.
            </p>
          ) : (
            <p className="text-[12px] text-[#6F6E69] px-1">
              Profile URL:{' '}
              <span className="font-mono font-medium text-[#141413]">
                spreadnfc.in/p/{previewIdentifier}
              </span>
              . Your physical QR (<span className="font-mono">{qrNumber}</span>) always stays permanent.
            </p>
          )}
        </div>
      </div>

      {/* Sticky Bottom Continue */}
      <div className="sticky bottom-0 -mx-4 border-t border-[#E6E4DF] bg-[#F7F6F3]/95 px-4 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex justify-end">
          <button
            type="button"
            disabled={slugStatus === 'invalid' || slugStatus === 'taken' || slugStatus === 'checking'}
            onClick={handleContinue}
            className="inline-flex h-12 w-full sm:w-auto sm:min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#141413] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#2A2A28] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#D5D2CA] disabled:text-[#85847F]"
          >
            <span>Preview Profile</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

