export function ArchitectureSecurity() {
  const pillars = [
    {
      title: 'Private Password Protection',
      subtitle: 'Only Authorized Staff Can Edit',
      description:
        'Your QR codes are locked behind your chosen private password. No outside visitor or competitor can tamper with or change your physical standee destination without your credentials.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
    },
    {
      title: 'Automatic Broken-Link Prevention',
      subtitle: 'Smart Pre-Save Verification',
      description:
        'Before any new link is saved to your QR code, our system automatically performs an instant live check to verify that your website is reachable, protecting you from embarrassing typos or dead pages.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      title: 'Lightning-Fast Customer Scans',
      subtitle: 'Instant Sub-Second Response',
      description:
        'When customers scan your standee, they are forwarded to your digital menu or review link in the blink of an eye. Fast loading keeps visitors engaged and minimizes drop-offs.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      title: '100% Lifetime Physical Reusability',
      subtitle: 'Zero Reprinting Expenses',
      description:
        'Invest once in beautiful acrylic, metallic, or wooden standees. You will never need to throw them away or pay for reprintings, even when your business offerings evolve completely.',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
        </svg>
      ),
    },
  ]

  return (
    <section id="security" className="py-28 bg-white text-ink relative overflow-hidden border-t border-surface-border">
      {/* Background Architectural Grid Pattern */}
      <div className="absolute inset-0 bg-grid-architectural opacity-50 pointer-events-none" />

      {/* Atmospheric Soft Royal Blue Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-electric/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-electric bg-electric/10 border border-electric/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse" />
            08 // TRUST &amp; PROTECTION
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Reliability and Security Built for{' '}
            <span className="font-editorial italic font-normal text-electric">
              Your Brand
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl mx-auto">
            Enjoy complete peace of mind knowing your customer traffic is always safe, verified, and directed exactly where you want it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {pillars.map((p, i) => (
            <div
              key={i}
              className="bg-surface-soft p-7 sm:p-8 rounded-2xl border border-surface-border hover:border-electric/40 hover:bg-white hover:shadow-xl transition-all duration-300 shadow-sm"
            >
              <div className="flex items-center gap-3.5 mb-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-surface-border text-electric shadow-xs">
                  {p.icon}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink">{p.title}</h3>
                  <span className="text-[11px] font-mono font-medium text-electric">{p.subtitle}</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
