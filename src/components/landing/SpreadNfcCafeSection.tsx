export function SpreadNfcCafeSection() {
  const CAFE_URL = 'https://cafe.spreadnfc.in/'

  const highlights = [
    {
      title: 'Instant Digital Menus',
      description: 'Guests tap or scan at the table to view live menus with zero app downloads.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: 'One-Tap Google Reviews',
      description: 'Boost cafe ratings effortlessly with smart counter standees and table cards.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: 'Real-Time Menu Swaps',
      description: 'Update daily specials, seasonal brews, and pricing anytime without reprinting.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ]

  return (
    <section
      id="spreadnfc-cafe"
      className="py-24 sm:py-28 bg-white text-ink relative overflow-hidden border-t border-surface-border"
    >
      {/* Background Architectural Grid */}
      <div className="absolute inset-0 bg-grid-architectural opacity-45 pointer-events-none" />

      {/* Subtle Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[780px] h-[420px] bg-lavender/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main Spotlight Card */}
        <div className="bg-atmospheric-hero text-white rounded-3xl border border-lavender/25 shadow-glow-deep overflow-hidden relative">
          {/* Subtle Inner Dot Grid */}
          <div className="absolute inset-0 bg-grid-dark opacity-60 pointer-events-none" />

          <div className="relative z-10 p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium tracking-wider text-lavender-light bg-lavender/15 border border-lavender/30">
                <span className="w-1.5 h-1.5 rounded-full bg-lavender animate-pulse" />
                <span>09 // SPREADNFC CAFE</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
                Experience{' '}
                <span className="font-editorial italic font-normal text-lavender-light">
                  SpreadNFC Cafe
                </span>
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Built exclusively for cafes, coffee houses, and modern dining spaces. Discover tailored NFC table standees, contactless digital menus, and instant guest engagement tools—all ready to deploy on our dedicated cafe platform.
              </p>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {highlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-cetacean-mid/80 border border-lavender/20 p-4 backdrop-blur-sm hover:border-lavender/45 transition-colors duration-200"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender/15 text-lavender-light mb-3 border border-lavender/25">
                      {item.icon}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-300/90 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Direct Seamless Redirect CTA */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center gap-4">
                <a
                  href={CAFE_URL}
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-sm text-white bg-lavender hover:bg-lavender-hover transition-all duration-200 shadow-lg shadow-lavender/30 hover:shadow-glow-lavender"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Visit SpreadNFC Cafe</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>

                <span className="inline-flex items-center justify-center sm:justify-start gap-2 text-xs font-mono text-lavender-soft/80">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>cafe.spreadnfc.in</span>
                </span>
              </div>
            </div>

            {/* Right Interactive Portal Preview Card (Click redirects seamlessly) */}
            <div className="lg:col-span-5">
              <a
                href={CAFE_URL}
                aria-label="Open SpreadNFC Cafe at cafe.spreadnfc.in"
                className="group block rounded-2xl bg-cetacean-mid/90 border border-lavender/30 hover:border-lavender p-6 sm:p-8 shadow-card-dark hover:shadow-card-glow transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-lavender/20 rounded-full blur-3xl group-hover:bg-lavender/30 transition-colors pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lavender/20 border border-lavender/35 text-lavender-light">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-white tracking-tight">
                          SpreadNFC Cafe
                        </p>
                        <p className="text-[11px] font-mono text-lavender-light">
                          cafe.spreadnfc.in
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>

                  {/* Mockup Rows */}
                  <div className="space-y-3">
                    <div className="rounded-xl bg-cetacean-deep/75 border border-lavender/15 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lavender/15 text-lavender-light text-xs font-mono font-bold">
                          01
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white">Smart Table Standees</p>
                          <p className="text-[11px] text-slate-400">Tap NFC or scan QR at every table</p>
                        </div>
                      </div>
                      <span className="text-lavender-light text-xs font-mono">NFC + QR</span>
                    </div>

                    <div className="rounded-xl bg-cetacean-deep/75 border border-lavender/15 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lavender/15 text-lavender-light text-xs font-mono font-bold">
                          02
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white">Live Cafe Menus &amp; Offers</p>
                          <p className="text-[11px] text-slate-400">Instant menu updates in seconds</p>
                        </div>
                      </div>
                      <span className="text-emerald-300 text-xs font-mono">Instant</span>
                    </div>

                    <div className="rounded-xl bg-cetacean-deep/75 border border-lavender/15 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lavender/15 text-lavender-light text-xs font-mono font-bold">
                          03
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white">Reviews &amp; Social Growth</p>
                          <p className="text-[11px] text-slate-400">Google Reviews, Instagram &amp; Wi-Fi</p>
                        </div>
                      </div>
                      <span className="text-lavender-light text-xs font-mono">1-Tap</span>
                    </div>
                  </div>

                  {/* Bottom Seamless Redirect Bar */}
                  <div className="pt-1 flex items-center justify-between text-xs font-semibold text-lavender-light group-hover:text-white transition-colors">
                    <span>Open SpreadNFC Cafe Website</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lavender/20 group-hover:bg-lavender text-lavender-light group-hover:text-white transition-all duration-200">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

