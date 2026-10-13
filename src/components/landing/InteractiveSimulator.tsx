import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

const PRESETS = [
  { label: 'Restaurant Menu', url: 'https://example.com/menu' },
  { label: 'Instagram Profile', url: 'https://instagram.com/yourbrand' },
  { label: 'Google Review Link', url: 'https://g.page/r/your-google-review' },
  { label: 'WhatsApp Chat', url: 'https://wa.me/919351042276' },
  { label: 'Special Promotion', url: 'https://example.com/weekend-sale' },
]

export function InteractiveSimulator() {
  const [qrNumber, setQrNumber] = useState('TABLE-01')
  const [targetUrl, setTargetUrl] = useState('https://example.com/menu')
  const [isFirstScanMode, setIsFirstScanMode] = useState(false)
  const [simulatingRedirect, setSimulatingRedirect] = useState(false)
  const [redirectLog, setRedirectLog] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    async function drawQR() {
      if (!canvasRef.current) return
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const qrPixelSize = 280
      const labelHeight = 44
      canvas.width = qrPixelSize
      canvas.height = qrPixelSize + labelHeight

      // Background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Encoded text
      const encodedText = isFirstScanMode
        ? `https://spreadnfc.in/update?qr=${encodeURIComponent(qrNumber.toUpperCase())}`
        : targetUrl

      const tempCanvas = document.createElement('canvas')
      await QRCode.toCanvas(tempCanvas, encodedText, {
        width: qrPixelSize,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })

      ctx.drawImage(tempCanvas, 0, 0)

      // Bottom label badge with QR Number
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(qrNumber.toUpperCase() || 'QR CODE', canvas.width / 2, qrPixelSize + labelHeight / 2)
    }

    drawQR()
  }, [qrNumber, targetUrl, isFirstScanMode])

  function handleSimulateScan() {
    setSimulatingRedirect(true)
    setRedirectLog(`Scanning QR ${qrNumber.toUpperCase()}...`)

    setTimeout(() => {
      if (isFirstScanMode) {
        setRedirectLog(`✨ First scan detected! Redirecting to setup: /update?qr=${qrNumber.toUpperCase()} so you can enter your link!`)
      } else {
        setRedirectLog(`🚀 Scan successful! Immediately opening destination: ${targetUrl}`)
      }
      setTimeout(() => {
        setSimulatingRedirect(false)
      }, 2500)
    }, 500)
  }

  function downloadCanvasImage() {
    if (!canvasRef.current) return
    const a = document.createElement('a')
    a.download = `${qrNumber.toUpperCase() || 'qr-code'}.png`
    a.href = canvasRef.current.toDataURL('image/png')
    a.click()
  }

  return (
    <div id="interactive-demo" className="relative py-24 bg-surface-soft text-ink overflow-hidden rounded-3xl my-16 border border-surface-border shadow-xl">
      {/* Background Architectural Grid Pattern */}
      <div className="absolute inset-0 bg-grid-architectural opacity-50 pointer-events-none" />

      {/* Atmospheric Soft Royal Blue Ambient Glow */}
      <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] bg-electric/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 left-10 w-[500px] h-[500px] bg-electric/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-lavender bg-lavender/10 border border-lavender/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-lavender animate-pulse" />
            03 // LIVE CLIENT SIMULATOR
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink leading-tight">
            See How Simple It Is to{' '}
            <span className="font-editorial italic font-normal text-lavender">
              Update Your Link
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
            Choose a preset link or type your own destination. Notice how your printed standee graphic never changes, yet anyone scanning it is immediately routed to your new page.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Controls Panel */}
          <div className="lg:col-span-7 space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-surface-border shadow-lg">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Your QR Code ID (Printed on Standee Base)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrNumber}
                  onChange={(e) => setQrNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. TABLE-01"
                  className="w-full bg-surface-soft border border-surface-border text-ink font-mono px-4 py-2.5 rounded-xl text-sm focus:border-electric focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setQrNumber(`TABLE-0${Math.floor(1 + Math.random() * 9)}`)}
                  className="px-4 py-2.5 text-xs font-medium bg-surface-subtle hover:bg-slate-200/80 text-ink rounded-xl transition-colors border border-surface-border whitespace-nowrap"
                >
                  Randomize
                </button>
              </div>
              <p className="text-[11px] text-ink-muted mt-1.5">
                This serial identifier stays permanently on your acrylic card or sticker.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-muted">
                  Customer Destination URL
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted">Brand new (unclaimed)</span>
                  <button
                    type="button"
                    onClick={() => setIsFirstScanMode(!isFirstScanMode)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isFirstScanMode ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                    title="Toggle brand new setup state"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isFirstScanMode ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {!isFirstScanMode ? (
                <>
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://yourwebsite.com/menu"
                    className="w-full bg-surface-soft border border-surface-border text-ink px-4 py-2.5 rounded-xl text-sm font-mono focus:border-electric focus:outline-none transition-colors"
                  />

                  {/* Preset Quick Links */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setTargetUrl(p.url)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          targetUrl === p.url
                            ? 'bg-lavender/15 border-lavender text-lavender font-semibold'
                            : 'bg-surface-soft border-surface-border text-ink-muted hover:text-ink hover:bg-surface-subtle'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  💡 <strong>Brand New Standee State:</strong> Fresh out-of-the-box QR cards prompt the owner to claim them on the first scan (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-800 font-mono">/update?qr={qrNumber}</code>), letting you assign your link and private password effortlessly.
                </div>
              )}
            </div>

            {/* Test Simulation Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSimulateScan}
                disabled={simulatingRedirect}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl font-bold text-sm bg-lavender hover:bg-lavender-hover text-white shadow-md shadow-lavender/25 hover:shadow-glow-lavender transition-all duration-200 disabled:opacity-50"
              >
                {simulatingRedirect ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Simulating Customer Phone Scan...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Simulate Customer Scanning QR {qrNumber}
                  </>
                )}
              </button>

              {/* Simulation Result feedback */}
              {redirectLog && (
                <div className="mt-3.5 p-4 bg-lavender/10 border border-lavender/30 rounded-xl font-mono text-xs text-lavender flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-lavender animate-ping shrink-0" />
                  <span className="break-all">{redirectLog}</span>
                </div>
              )}
            </div>
          </div>

          {/* Live QR Output Canvas Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-sm bg-white p-6 sm:p-7 rounded-2xl shadow-xl text-ink flex flex-col items-center border border-surface-border">
              <div className="w-full flex items-center justify-between pb-3 border-b border-surface-border text-xs font-semibold text-ink-muted">
                <span className="font-mono text-[10px] uppercase tracking-wider">PHYSICAL STANDEE PREVIEW</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Always Scannable
                </span>
              </div>

              {/* Rendered Canvas */}
              <div className="p-3 my-5 bg-surface-subtle border border-surface-border rounded-xl flex items-center justify-center shadow-inner">
                <canvas ref={canvasRef} className="max-w-full h-auto rounded" />
              </div>

              <div className="w-full space-y-1 text-center">
                <p className="text-xs text-ink-muted font-mono">
                  Permanent QR: {qrNumber.toUpperCase()}
                </p>
                <p className="text-xs font-medium text-ink truncate">
                  Opens: {isFirstScanMode ? '(First-Scan Setup Screen)' : targetUrl}
                </p>
              </div>

              <div className="w-full mt-4 pt-3.5 border-t border-surface-border flex gap-2">
                <button
                  type="button"
                  onClick={downloadCanvasImage}
                  className="flex-1 py-2.5 px-3 text-xs font-semibold text-ink bg-surface-subtle hover:bg-slate-200/80 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download Sample PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
