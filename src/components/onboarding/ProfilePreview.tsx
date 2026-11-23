import { useEffect, useState } from 'react'
import { Check, Copy, Pencil, QrCode, Sparkles } from 'lucide-react'
import { profilePublicUrl, qrPublicUrl } from '../../lib/config'
import { generateQrDataUrl } from '../../lib/qr'
import type { ProfileTheme, PublicLinkItem, PublicProfileData } from '../../types'
import { Spinner } from '../Spinner'
import { PublicProfileView } from '../profile/PublicProfileView'
import { ThemeTemplatePicker } from '../profile/ThemeTemplatePicker'

interface ProfilePreviewProps {
  qrNumber: string
  profile: PublicProfileData
  links: PublicLinkItem[]
  publishing: boolean
  publishError: string | null
  onThemeChange: (theme: ProfileTheme) => void
  onEditStep: (step: number) => void
  onPublish: () => void
}

export function ProfilePreview({
  qrNumber,
  profile,
  links,
  publishing,
  publishError,
  onThemeChange,
  onEditStep,
  onPublish,
}: ProfilePreviewProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const identifier = profile.public_slug?.trim() || qrNumber
  const finalUrl = profilePublicUrl(identifier)

  useEffect(() => {
    if (!showQr || qrDataUrl) return
    let cancelled = false
    generateQrDataUrl(qrNumber).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [showQr, qrDataUrl, qrNumber])

  async function handleCopy() {
    await navigator.clipboard.writeText(finalUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 1600)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.025em] leading-[1.15] text-[#141413]">
          Your profile is taking shape
        </h1>
        <p className="mt-2 text-[15px] text-[#5C5B57] leading-relaxed">
          Preview how your profile will look when someone scans your QR.
        </p>
      </div>

      {/* Profile URL & Theme Controls */}
      <div className="rounded-2xl border border-[#E6E4DF] bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#6F6E69]">
              Profile URL
            </p>
            <p className="mt-0.5 truncate font-mono text-[13px] font-medium text-[#141413]">
              {finalUrl}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-1.5 text-[12px] font-semibold text-[#141413] hover:border-[#CFCBC3] transition-colors"
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedUrl ? 'Copied' : 'Copy link'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQr((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#42413D] hover:border-[#141413] transition-colors"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>{showQr ? 'Hide QR' : 'Preview QR'}</span>
            </button>
          </div>
        </div>

        {showQr && (
          <div className="border-t border-[#E6E4DF] pt-3 flex items-center gap-4">
            <div className="h-24 w-24 shrink-0 rounded-xl border border-[#E6E4DF] bg-white p-1.5 flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR ${qrNumber}`} className="h-full w-full object-contain" />
              ) : (
                <Spinner size={20} className="text-[#5C5B57]" />
              )}
            </div>
            <div className="text-[12px] text-[#5C5B57] space-y-1">
              <p className="font-semibold text-[#141413]">Permanent QR: {qrNumber}</p>
              <p className="font-mono text-[11px] break-all">{qrPublicUrl(qrNumber)}</p>
              <p>Scanning your physical card redirects straight to your profile.</p>
            </div>
          </div>
        )}

        {/* Quick Edit Shortcuts & Template Picker */}
        <div className="border-t border-[#E6E4DF] pt-3 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEditStep(4)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#F7F6F3] px-2.5 py-1 text-[12px] font-medium text-[#42413D] hover:bg-[#ECEAE4] transition-colors"
            >
              <Pencil className="h-3 w-3" />
              <span>Edit details</span>
            </button>
            <button
              type="button"
              onClick={() => onEditStep(3)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#F7F6F3] px-2.5 py-1 text-[12px] font-medium text-[#42413D] hover:bg-[#ECEAE4] transition-colors"
            >
              <Pencil className="h-3 w-3" />
              <span>Change avatar</span>
            </button>
            <button
              type="button"
              onClick={() => onEditStep(2)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#F7F6F3] px-2.5 py-1 text-[12px] font-medium text-[#42413D] hover:bg-[#ECEAE4] transition-colors"
            >
              <Pencil className="h-3 w-3" />
              <span>Edit links</span>
            </button>
          </div>

          <ThemeTemplatePicker
            mode="personal"
            value={profile.theme}
            onChange={onThemeChange}
          />
        </div>
      </div>

      {/* Live Public Profile Preview (reuses exact PublicProfileView component) */}
      <div className="mx-auto max-w-[400px] overflow-hidden rounded-[32px] border-[6px] border-[#1E1E20] bg-[#1E1E20] shadow-[0_20px_50px_-15px_rgba(20,20,19,0.22)]">
        <div className="max-h-[620px] overflow-y-auto rounded-[26px]">
          <PublicProfileView
            profile={profile}
            links={links}
            qrNumber={qrNumber}
            previewMode
            onThemeChange={onThemeChange}
          />
        </div>
      </div>

      {publishError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
          {publishError}
        </p>
      )}

      {/* Sticky Bottom Publish CTA */}
      <div className="sticky bottom-0 -mx-4 border-t border-[#E6E4DF] bg-[#F7F6F3]/95 px-4 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex justify-end">
          <button
            type="button"
            disabled={publishing}
            onClick={onPublish}
            className="inline-flex h-12 w-full sm:w-auto sm:min-w-[220px] items-center justify-center gap-2 rounded-xl bg-[#141413] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#2A2A28] active:scale-[0.99] disabled:opacity-60"
          >
            {publishing ? <Spinner size={16} /> : <Sparkles className="h-4 w-4" />}
            <span>{publishing ? 'Publishing Profile…' : 'Publish & Activate QR'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

