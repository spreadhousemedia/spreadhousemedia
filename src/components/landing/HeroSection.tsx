import { Link } from 'react-router-dom'

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 overflow-hidden bg-white text-ink border-b border-surface-border">
      {/* Background Architectural Grid Pattern */}
      <div className="absolute inset-0 bg-grid-architectural opacity-50 pointer-events-none" />

      {/* Atmospheric Soft Royal Blue Ambient Glow */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-electric/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[350px] bg-electric/8 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Asymmetric Editorial Typography */}
          <div className="lg:col-span-7 space-y-7">
            {/* Restrained Eyebrow metadata */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-mono tracking-wider uppercase text-lavender bg-lavender/10 border border-lavender/20">
              <span className="w-1.5 h-1.5 rounded-full bg-lavender animate-pulse" />
              <span>Smart Dynamic QR Infrastructure</span>
            </div>

            {/* Editorial Headline with Serif Accent */}
            <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold tracking-tight text-ink leading-[1.08]">
              Print Your QR Once.{' '}
              <span className="font-editorial italic font-normal text-lavender block mt-1">
                Change Your Link Anytime.
              </span>
            </h1>

            {/* Concise Supporting Copy with Comfortable Line Length */}
            <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-xl font-normal">
              Physical acrylic standees, table cards, and product packaging that never become obsolete. When menus, promotions, or social profiles change, update your link online in 30 seconds with zero reprint waste.
            </p>

            {/* Call to Action Group */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                to="/update"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-lavender hover:bg-lavender-hover shadow-md shadow-lavender/25 hover:shadow-glow-lavender transition-all duration-200"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Update My QR/NFC Link</span>
              </Link>

              <a
                href="#interactive-demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-ink bg-surface-subtle hover:bg-slate-200/80 border border-surface-border transition-all duration-200"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                </svg>
                <span>Try Live Simulator</span>
              </a>
            </div>

            {/* Proof Details Bar with Hairline Dividers */}
            <div className="pt-6 border-t border-surface-border grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-ink-muted">
              <div>
                <span className="block text-ink font-mono font-bold text-sm sm:text-base">0%</span>
                <span className="text-[11px] text-ink-muted">Reprint Expense</span>
              </div>
              <div>
                <span className="block text-ink font-mono font-bold text-sm sm:text-base">&lt; 30s</span>
                <span className="text-[11px] text-ink-muted">Destination Update</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="block text-lavender font-mono font-bold text-sm sm:text-base">100%</span>
                <span className="text-[11px] text-ink-muted">Camera Compatible</span>
              </div>
            </div>
          </div>

          {/* Right Column: Art-Directed Physical Artifact Mockup */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm sm:max-w-md">
              {/* Soft ambient back glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-lavender/25 via-purple-300/10 to-cetacean/20 rounded-3xl blur-2xl -z-10" />

              {/* Physical Standee Card Representation */}
              <div className="bg-white border border-surface-border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
                {/* Header bar of physical asset */}
                <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-lavender" />
                    <span className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                      ACRYLIC STANDEE
                    </span>
                  </div>
                  <span className="font-mono text-xs text-lavender bg-lavender/10 px-2.5 py-1 rounded-md border border-lavender/20 font-semibold">
                    ID: TABLE-04
                  </span>
                </div>

                {/* Physical QR Surface Preview */}
                <div className="bg-surface-soft border border-surface-border rounded-2xl p-6 text-center text-ink flex flex-col items-center">
                  <div className="w-48 h-48 bg-white border border-surface-border rounded-xl p-3 flex flex-col items-center justify-center shadow-xs">
                    <svg viewBox="0 0 24 24" className="w-full h-full text-ink" fill="currentColor">
                      <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h2v2h-2v-2zm-4 0h2v4h-2v-4zm2 4h2v2h-2v-2zm-2 2h2v2h-2v-2zm4-2h2v4h-2v-4zm2-2h2v2h-2v-2z" />
                    </svg>
                  </div>
                  <span className="mt-3 font-mono font-bold text-xs tracking-wider text-ink uppercase">
                    TABLE-04
                  </span>
                  <span className="text-[10px] text-ink-muted">Scan with any phone camera</span>
                </div>

                {/* Real-time Dynamic Redirect Indicator */}
                <div className="p-3.5 rounded-xl bg-surface-soft border border-surface-border space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Live Destination:</span>
                    <span className="text-lavender font-mono font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-ink bg-white border border-surface-border px-3 py-2 rounded-lg truncate">
                    <span className="truncate">https://mycafe.com/seasonal-menu</span>
                    <span className="text-[10px] text-emerald-700 font-sans font-bold bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                      200 OK
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[11px] text-ink-muted">
                    Physical standee remains permanent. Link changes anytime via private password.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
