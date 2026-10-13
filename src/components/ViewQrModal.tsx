import { useEffect, useState } from 'react'
import { Check, Copy, Download, X } from 'lucide-react'
import { generateQrDataUrl, downloadSingleQr } from '../lib/qr'
import { qrPublicUrl } from '../lib/config'
import { Spinner } from './Spinner'

export function ViewQrModal({ qrNumber, onClose }: { qrNumber: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setDataUrl(null)
    generateQrDataUrl(qrNumber).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [qrNumber])

  async function handleCopy() {
    await navigator.clipboard.writeText(qrPublicUrl(qrNumber))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="theme-card relative w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="theme-text-muted hover:text-white absolute right-4 top-4 rounded-lg p-1.5 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="inline-block rounded-full bg-brand-50 dark:bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
          QR Code Preview
        </span>
        <h3 className="theme-text-main mt-2 text-xl font-bold tracking-tight">{qrNumber}</h3>

        <div className="mx-auto mt-4 flex h-60 w-60 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white p-3 shadow-inner">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR code for ${qrNumber}`} className="h-full w-full object-contain" />
          ) : (
            <Spinner size={32} className="text-brand-600" />
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="theme-text-muted mt-3.5 inline-flex items-center gap-1.5 break-all text-xs font-medium hover:text-brand-500 transition-colors"
          title="Click to copy link"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied to clipboard!' : qrPublicUrl(qrNumber)}</span>
        </button>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => downloadSingleQr(qrNumber, 'png')}
            className="theme-subtle inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold theme-hover transition-colors"
          >
            <Download className="h-4 w-4" />
            PNG
          </button>
          <button
            type="button"
            onClick={() => downloadSingleQr(qrNumber, 'svg')}
            className="theme-subtle inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold theme-hover transition-colors"
          >
            <Download className="h-4 w-4" />
            SVG
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="theme-text-muted mt-3 w-full rounded-xl py-2 text-xs font-medium hover:text-white transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
