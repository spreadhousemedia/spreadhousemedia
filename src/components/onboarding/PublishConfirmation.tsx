import { useEffect, useState } from 'react'
import { Check, CheckCircle2, Copy, Download, ExternalLink, Pencil } from 'lucide-react'
import { profilePublicUrl, qrPublicUrl } from '../../lib/config'
import { downloadSingleQr, generateQrDataUrl } from '../../lib/qr'
import { Spinner } from '../Spinner'

interface PublishConfirmationProps {
  qrNumber: string
  publicSlug: string | null
  onOpenEditor: () => void
}

export function PublishConfirmation({
  qrNumber,
  publicSlug,
  onOpenEditor,
}: PublishConfirmationProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const identifier = publicSlug?.trim() || qrNumber
  const liveProfileUrl = profilePublicUrl(identifier)
  const permanentQr = qrPublicUrl(qrNumber)

  useEffect(() => {
    let cancelled = false
    generateQrDataUrl(qrNumber).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [qrNumber])

  async function handleCopy() {
    await navigator.clipboard.writeText(liveProfileUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 1600)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3 pt-2">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
        </span>

        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.025em] leading-[1.15] text-[#141413]">
          Your digital identity is ready.
        </h1>
        <p className="mx-auto max-w-md text-[15px] text-[#5C5B57] leading-relaxed">
          Scanning your physical QR code <span className="font-mono font-semibold text-[#141413]">{qrNumber}</span> now opens your live Personal Profile.
        </p>
      </div>

      {/* Profile Link & QR Card */}
      <div className="rounded-3xl border border-[#E6E4DF] bg-white p-6 space-y-6 shadow-[0_2px_12px_rgba(20,20,19,0.04)]">
        {/* Live Public URL */}
        <div className="rounded-2xl border border-[#E6E4DF] bg-[#FAF9F7] p-4 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#6F6E69]">
            Public Profile Link
          </p>
          <p className="break-all font-mono text-[13px] sm:text-[14px] font-semibold text-[#141413]">
            {liveProfileUrl}
          </p>
          <div className="pt-1 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#141413] hover:border-[#141413] transition-colors"
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedUrl ? 'Copied link' : 'Copy profile link'}</span>
            </button>

            <a
              href={liveProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#141413] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#2A2A28] transition-colors"
            >
              <span>Open profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Permanent QR Preview */}
        <div className="flex flex-col sm:flex-row items-center gap-5 border-t border-[#E6E4DF] pt-5">
          <div className="h-36 w-36 shrink-0 rounded-2xl border border-[#E6E4DF] bg-white p-2 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code ${qrNumber}`} className="h-full w-full object-contain" />
            ) : (
              <Spinner size={24} className="text-[#5C5B57]" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#6F6E69]">
                Permanent QR Number
              </p>
              <p className="font-mono text-[16px] font-bold text-[#141413]">{qrNumber}</p>
            </div>

            <p className="text-[12px] text-[#5C5B57] leading-relaxed">
              Your physical QR (<span className="font-mono">{permanentQr}</span>) never changes, even if you update your custom username later.
            </p>

            <div className="pt-1 flex flex-wrap justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => downloadSingleQr(qrNumber, 'png')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-2 text-[12px] font-semibold text-[#141413] hover:border-[#141413] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PNG</span>
              </button>
              <button
                type="button"
                onClick={() => downloadSingleQr(qrNumber, 'svg')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-2 text-[12px] font-semibold text-[#141413] hover:border-[#141413] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download SVG</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onOpenEditor}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E6E4DF] bg-white px-5 py-3 text-[14px] font-semibold text-[#141413] hover:border-[#141413] transition-colors"
        >
          <Pencil className="h-4 w-4" />
          <span>Edit Profile &amp; Links</span>
        </button>
      </div>
    </div>
  )
}

