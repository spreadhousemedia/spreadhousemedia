import { useState } from 'react'

export function AboutFounderSection() {
  const [copiedEmail, setCopiedEmail] = useState(false)

  function handleCopyEmail() {
    navigator.clipboard.writeText('contact@spreadnfc.in')
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  return (
    <section id="about" className="py-28 bg-white text-ink relative overflow-hidden border-t border-surface-border">
      {/* Background Architectural Grid */}
      <div className="absolute inset-0 bg-grid-architectural opacity-40 pointer-events-none" />

      {/* Atmospheric Soft Royal Blue Ambient Glow */}
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[400px] bg-electric/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-electric bg-electric/10 border border-electric/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse" />
            ABOUT Spread NFC &amp; THE FOUNDER
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Built with Purpose for{' '}
            <span className="font-editorial italic font-normal text-electric">
              Real Businesses
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
            A vision to eliminate physical printing waste and empower venues with permanent hardware and instant digital agility.
          </p>
        </div>

        {/* Founder Card & Vision Story */}
        <div className="max-w-5xl mx-auto bg-surface-soft border border-surface-border rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Founder Portrait & Direct Actions */}
            <div className="lg:col-span-5 flex flex-col items-center text-center">
              <div className="relative group">
                {/* Ambient glow behind image */}
                <div className="absolute inset-0 bg-gradient-to-tr from-lavender/25 to-cetacean/25 rounded-3xl blur-xl transition-all duration-300 group-hover:blur-2xl" />

                {/* Portrait Image */}
                <div className="relative w-64 h-80 sm:w-72 sm:h-96 rounded-3xl overflow-hidden border-2 border-white shadow-2xl bg-white">
                  <img
                    src="/aditya.jpg"
                    alt="Aditya — Founder of Spread NFC"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 text-left">
                    <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase text-white bg-electric/90 backdrop-blur-md shadow-xs">
                      Founder
                    </span>
                  </div>
                </div>
              </div>

              {/* Founder Name & Title */}
              <div className="mt-6 space-y-1">
                <h3 className="text-2xl font-extrabold text-ink tracking-tight">Aditya</h3>
                <p className="text-xs font-mono font-semibold text-electric uppercase tracking-wider">
                  Founder &amp; Creator of Spread NFC
                </p>
              </div>

              {/* Direct Interactive Contact Bar */}
              <div className="mt-6 w-full flex items-center justify-center gap-3">
                {/* Call Founder Icon Button (Calls tel:9351042276 directly, number hidden from visible text) */}
                <a
                  href="tel:9351042276"
                  title="Call Founder Directly"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-electric hover:bg-electric-hover shadow-md transition-all duration-200 group"
                  aria-label="Call Founder Directly"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="transition-transform group-hover:rotate-12"
                  >
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  <span>Direct Call</span>
                </a>

                {/* Email Action */}
                <a
                  href="mailto:contact@spreadnfc.in"
                  title="Email Founder"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-ink bg-white hover:bg-surface-subtle border border-surface-border shadow-xs transition-all duration-200"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                  <span className="font-mono text-[11px]">Email</span>
                </a>
              </div>
            </div>

            {/* Right: Founder's Vision & Note */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-muted">
                  <span className="text-electric font-bold">“</span>
                  <span>Founder's Note</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-snug">
                  Why I Built{' '}
                  <span className="font-editorial italic font-normal text-electric">
                    Spread NFC
                  </span>
                </h3>
              </div>

              {/* Founder's Thought Block */}
              <div className="relative bg-white rounded-2xl p-6 sm:p-7 border border-surface-border shadow-xs space-y-4">
                <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                  Walking into local restaurants, cafes, and retail shops, I constantly noticed owners throwing away stacks of expensive acrylic table cards, counter standees, and stickers whenever a seasonal menu changed, prices shifted, or a new campaign launched.
                </p>
                <p className="text-sm sm:text-base text-ink leading-relaxed font-medium">
                  Physical marketing was completely stuck in the past—costly, slow, and wasteful. If you made a single typo or updated your link, hundreds of printed cards went straight to the trash.
                </p>
                <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                  I created <strong className="text-ink font-semibold">Spread NFC</strong> to give business owners the best of both worlds: invest in premium physical standees just once, and retain 100% digital agility forever. With dynamic redirection and password protection, your physical hardware stays permanent while your live destinations update in 30 seconds right from your phone.
                </p>
              </div>

              {/* Founder's Core Values / Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-white rounded-xl border border-surface-border flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-electric/10 text-electric">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Zero Reprint Waste</h4>
                    <p className="text-[11px] text-ink-muted mt-0.5">Permanent physical cards that never need to be discarded.</p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-surface-border flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Direct Support</h4>
                    <p className="text-[11px] text-ink-muted mt-0.5">Personal assistance for venue setups and custom deployments.</p>
                  </div>
                </div>
              </div>

              {/* Display Gmail with Copy Button */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-surface-border">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-subtle text-ink">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M22 6l-10 7L2 6" />
                      </svg>
                    </span>
                    <div>
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                        Official Founder Inquiries
                      </span>
                      <a
                        href="mailto:contact@spreadnfc.in"
                        className="text-xs sm:text-sm font-mono font-bold text-ink hover:text-electric transition-colors"
                      >
                        contact@spreadnfc.in
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="px-3 py-1.5 text-xs font-medium text-ink bg-surface-subtle hover:bg-slate-200/80 rounded-lg transition-colors border border-surface-border"
                    >
                      {copiedEmail ? '✓ Copied' : 'Copy Email'}
                    </button>
                    <a
                      href="mailto:contact@spreadnfc.in"
                      className="px-3 py-1.5 text-xs font-bold text-white bg-electric hover:bg-electric-hover rounded-lg transition-colors"
                    >
                      Send Message
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
