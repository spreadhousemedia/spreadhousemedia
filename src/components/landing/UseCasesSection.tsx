export function UseCasesSection() {
  const cases = [
    {
      title: 'Restaurants, Cafes & Bars',
      tagline: 'Table Standees & Contactless Menus',
      description:
        'Print acrylic table standees with permanent numbers (e.g. TAB-01 to TAB-50). Swap between Breakfast, Lunch, and Happy Hour menus in seconds without touching the tables.',
      badge: 'Hospitality',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
        </svg>
      ),
    },
    {
      title: 'Product Packaging & Hardware',
      tagline: 'Smart Instruction Manuals & Warranties',
      description:
        'Laser-etch or print QR codes onto physical appliances and hardware boxes. Update warranty claim forms or PDF manuals long after the products have shipped.',
      badge: 'Manufacturing',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      ),
    },
    {
      title: 'Agencies & Print Shops',
      tagline: 'Turnkey Dynamic QR Merchandising',
      description:
        'Pre-print thousands of high-end metallic or wooden NFC/QR smart cards. Hand them to clients with their unique passwords; they self-onboard on /update effortlessly.',
      badge: 'White-Label & Print',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      title: 'Conferences & Exhibitions',
      tagline: 'Lanyards, Badges & Booth Signage',
      description:
        'Print badges weeks ahead of the summit. Dynamically redirect badge scans to real-time speaker presentations, schedule adjustments, or lead capture pages.',
      badge: 'Events',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
        </svg>
      ),
    },
  ]

  return (
    <section id="use-cases" className="py-28 bg-surface-soft border-t border-surface-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-lavender bg-lavender/10 border border-lavender/20 mb-4">
            07 // VERSATILITY
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Tailored for Physical{' '}
            <span className="font-editorial italic font-normal text-lavender">
              Business Environments
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
            Discover how leading organizations turn physical counters, tables, and packaging into agile, real-time digital touchpoints.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {cases.map((c, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-7 border border-surface-border hover:border-lavender/40 transition-all duration-200 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-soft border border-surface-border text-lavender">
                    {c.icon}
                  </span>
                  <span className="text-[10px] font-mono font-semibold tracking-wider text-ink-muted uppercase bg-surface-subtle px-2.5 py-1 rounded-md">
                    {c.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink mb-1">{c.title}</h3>
                <p className="text-xs font-semibold text-lavender mb-3">{c.tagline}</p>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  {c.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
