import { Link } from 'react-router-dom'

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Get Your Smart QR Standee or Sticker',
      category: 'YOUR HARDWARE',
      description:
        'Display high-quality acrylic table standees, counter signs, or durable vinyl stickers at your business. Each piece has a unique serial number permanently printed on it.',
      highlights: ['Permanent physical standee', 'Clean serial ID printed on card', 'Zero need to ever replace it'],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M14 14h7v7h-7z" />
        </svg>
      ),
    },
    {
      num: '02',
      title: 'First-Scan Quick Setup',
      category: 'ACTIVATION',
      description:
        'When you receive your fresh standee, simply scan it with your phone camera. It automatically opens the setup screen where you type your website link and your private password.',
      highlights: ['No app installation needed', 'Set link & password in 30 seconds', 'Instant live activation'],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ),
    },
    {
      num: '03',
      title: 'Customers Scan Seamlessly',
      category: 'DAILY BUSINESS',
      description:
        'Customers point their phone cameras at your standee. In less than a second, they are taken directly to your digital menu, Instagram, Google review, or booking page.',
      highlights: ['Works with all iPhone & Android cameras', 'Fast sub-second loading', 'Zero login required for customers'],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
    {
      num: '04',
      title: 'Update Your Link Whenever You Wish',
      category: 'CONTINUOUS AGILITY',
      description:
        'Got a new special menu, weekend promotion, or new social account? Open the Update Link portal, type your password, and save your new destination. Your physical standee stays where it is!',
      highlights: ['Protected by your secret password', 'Instant link switch across all cards', 'Never pay for reprinting again'],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
    },
  ]

  return (
    <section id="how-it-works" className="py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-electric bg-electric/10 border border-electric/20 mb-4">
            04 // OPERATIONAL LIFECYCLE
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            How Smart Dynamic QR Codes{' '}
            <span className="font-editorial italic font-normal text-electric">
              Transform Daily Operations
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
            Experience complete freedom to switch your business links anytime without ever spending another rupee or dollar reprinting physical cards.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group relative flex flex-col justify-between bg-surface-soft hover:bg-white rounded-2xl p-7 border border-surface-border hover:border-electric/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-surface-border text-electric shadow-xs group-hover:bg-electric group-hover:text-white transition-colors duration-200">
                    {step.icon}
                  </span>
                  <span className="font-editorial italic text-4xl font-light text-slate-300 group-hover:text-electric transition-colors">
                    {step.num}
                  </span>
                </div>

                <span className="text-[10px] font-mono font-semibold tracking-wider text-electric uppercase">
                  {step.category}
                </span>

                <h3 className="text-lg font-bold text-ink mt-1.5 mb-2.5 group-hover:text-electric transition-colors">
                  {step.title}
                </h3>

                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-border">
                <ul className="space-y-2 text-xs text-ink-muted font-medium">
                  {step.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-emerald-600 stroke-current shrink-0" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Step-by-step editorial light banner for updating */}
        <div id="how-to-update" className="mt-16 bg-surface-soft text-ink rounded-3xl p-8 sm:p-10 border border-surface-border shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-electric/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 text-center md:text-left relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-electric bg-electric/10 border border-electric/20 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse" />
              Immediate Self-Service
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              Need to change your link right now?
            </h3>
            <p className="text-sm text-ink-muted max-w-xl leading-relaxed">
              Open the Update Portal on any phone or computer. Enter your QR code serial (found at the bottom of your physical standee), your private password, and your new destination link.
            </p>
          </div>
          <Link
            to="/update"
            className="shrink-0 relative z-10 inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-electric hover:bg-electric-hover shadow-md transition-all duration-200"
          >
            <span>Open Update Portal</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
