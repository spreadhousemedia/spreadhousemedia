import { AnimatedCounter } from './AnimatedCounter'
import { Link } from 'react-router-dom'

export function ImpactMetricsSection() {
  const metrics = [
    {
      value: 100,
      suffix: '%',
      label: 'Reprint Costs Eliminated',
      sublabel: 'One-time physical investment. Standees remain active permanently.',
      tone: 'emerald',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      value: 30,
      suffix: 's',
      label: 'Average Time to Update Link',
      sublabel: 'Change destinations on the fly from any smartphone browser.',
      tone: 'sky',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      value: 340,
      prefix: '+',
      suffix: '%',
      label: 'Higher Customer Engagement',
      sublabel: 'Directing visitors straight to Google Reviews, menus, and socials.',
      tone: 'indigo',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
    {
      value: 2400,
      prefix: '$',
      suffix: '+',
      label: 'Average Annual Savings / Venue',
      sublabel: 'No recurring print orders, rush designer fees, or waste disposal.',
      tone: 'amber',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
        </svg>
      ),
    },
  ]

  const toneClasses: Record<string, { badge: string; iconBg: string; text: string; glow: string }> = {
    emerald: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
      text: 'text-emerald-600',
      glow: 'hover:border-emerald-500/40',
    },
    sky: {
      badge: 'bg-electric/10 text-electric border-electric/20',
      iconBg: 'bg-electric/10 text-electric border border-electric/20',
      text: 'text-electric',
      glow: 'hover:border-electric/40',
    },
    indigo: {
      badge: 'bg-lavender/10 text-lavender border-lavender/25',
      iconBg: 'bg-lavender/10 text-lavender border border-lavender/20',
      text: 'text-lavender',
      glow: 'hover:border-lavender/40',
    },
    amber: {
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200/60',
      text: 'text-amber-600',
      glow: 'hover:border-amber-500/40',
    },
  }

  return (
    <section id="impact-metrics" className="py-28 bg-white text-ink relative overflow-hidden border-b border-surface-border">
      {/* Architectural subtle grid pattern */}
      <div className="absolute inset-0 bg-grid-architectural opacity-40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-electric bg-electric/10 border border-electric/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse" />
            02 // PROVEN BUSINESS IMPACT &amp; ROI
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Real Numbers.{' '}
            <span className="font-editorial italic font-normal text-electric">
              Measurable ROI.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
            See how businesses eliminate recurring printing overhead, accelerate customer actions, and keep physical branding 100% agile.
          </p>
        </div>

        {/* 4 Premium Metric Cards with Animated Running Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, idx) => {
            const tone = toneClasses[m.tone]
            return (
              <div
                key={idx}
                className={`group relative bg-surface-soft hover:bg-white rounded-2xl p-6 sm:p-7 border border-surface-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${tone.glow} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone.iconBg}`}>
                      {m.icon}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted bg-surface-subtle px-2 py-0.5 rounded border border-surface-border">
                      Verified Metric
                    </span>
                  </div>

                  {/* Animated Counter */}
                  <div className="flex items-baseline">
                    <AnimatedCounter
                      end={m.value}
                      prefix={m.prefix}
                      suffix={m.suffix}
                      duration={2200}
                      className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink font-mono"
                    />
                  </div>

                  <h3 className="text-sm font-bold text-ink mt-2.5">{m.label}</h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{m.sublabel}</p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-surface-border flex items-center justify-between text-[11px] text-ink-muted">
                  <span>Business Result</span>
                  <span className={`font-semibold ${tone.text}`}>Instant Benefit</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Before vs. After Business Transformation Story */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-electric bg-electric/10 px-3 py-1 rounded-full border border-electric/20">
              The Operational Transformation
            </span>
            <h3 className="mt-3 text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Life Before vs. Life After{' '}
              <span className="font-editorial italic font-normal text-electric">
                Spread NFC
              </span>
            </h3>
            <p className="mt-2 text-sm text-ink-muted">
              A side-by-side look at how switching to dynamic codes transforms daily operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Way (Before) */}
            <div className="bg-[#FFF8F8] rounded-2xl p-7 sm:p-8 border border-rose-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-rose-200/80 mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-100/80 border border-rose-300">
                    <span>✕</span>
                    <span>BEFORE Spread NFC</span>
                  </span>
                  <span className="text-xs text-rose-500 font-mono">Traditional Static QRs</span>
                </div>

                <ul className="space-y-4 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="text-rose-600 font-bold text-base shrink-0">✕</span>
                    <div>
                      <strong className="text-slate-900 block font-semibold">Reprinting 4–6 Times a Year:</strong>
                      Whenever prices, dishes, or links change, all table standees must be thrown into the trash and re-purchased.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-600 font-bold text-base shrink-0">✕</span>
                    <div>
                      <strong className="text-slate-900 block font-semibold">5–7 Days Turnaround Delays:</strong>
                      Waiting for graphic designers and print delivery before new seasonal campaigns can launch.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-600 font-bold text-base shrink-0">✕</span>
                    <div>
                      <strong className="text-slate-900 block font-semibold">Embarrassing 404 Errors:</strong>
                      If an old link moves or expires, existing printed stickers display broken pages to hungry or interested customers.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-600 font-bold text-base shrink-0">✕</span>
                    <div>
                      <strong className="text-slate-900 block font-semibold">Zero Promotional Flexibility:</strong>
                      Stuck with one link forever. Cannot switch to Google Reviews or weekend flash sales without new prints.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-rose-200/80 flex items-center justify-between text-xs text-rose-700 font-mono">
                <span>Annual Waste:</span>
                <span className="font-bold">~$2,000+ &amp; Countless Hours Lost</span>
              </div>
            </div>

            {/* The Smart Way (After) */}
            <div className="bg-[#F4FBF7] rounded-2xl p-7 sm:p-8 border border-emerald-300 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-emerald-200 mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300">
                    <span>✓</span>
                    <span>AFTER Spread NFC</span>
                  </span>
                  <span className="text-xs text-emerald-700 font-mono font-semibold">Smart Dynamic QRs</span>
                </div>

                <ul className="space-y-4 text-xs sm:text-sm text-slate-800">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold text-base shrink-0">✓</span>
                    <div>
                      <strong className="text-slate-900 block font-semibold">100% Zero Reprinting Ever:</strong>
                      Invest once in high-grade acrylic, wood, or metallic standees. They remain permanently in place on your counters and tables.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold text-base shrink-0">✓</span>
                    <div>
                      <strong className="text-slate-900 block font-semibold">Instant 30-Second Link Updates:</strong>
                      Change destinations online from your smartphone browser in seconds—the update goes live across all standees immediately.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold text-base shrink-0">✓</span>
                    <div>
                      <strong className="text-slate-900 block font-semibold">Automatic Pre-Save Verification:</strong>
                      Our system automatically tests your link before saving to guarantee your customers never encounter broken pages.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-600 font-bold text-base shrink-0">✓</span>
                    <div>
                      <strong className="text-slate-900 block font-semibold">Dynamic Campaign Rotation:</strong>
                      Breakfast Menu in the morning ➔ Happy Hour in the evening ➔ 5-Star Google Reviews on weekends.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-emerald-200 flex items-center justify-between text-xs text-emerald-700 font-mono">
                <span>Net Savings:</span>
                <span className="font-bold text-sm">$0 Reprint Cost &amp; Infinite Agility</span>
              </div>
            </div>
          </div>

          {/* Quick CTA */}
          <div className="mt-12 text-center">
            <Link
              to="/update"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-electric hover:bg-electric-hover transition-all duration-200 shadow-md"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Update Your QR Standee Link Now</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
