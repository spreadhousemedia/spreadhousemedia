import { Link } from 'react-router-dom'

export function CtaFooter() {
  return (
    <footer className="bg-white text-ink relative overflow-hidden border-t border-surface-border">
      {/* Background Architectural Grid Pattern */}
      <div className="absolute inset-0 bg-grid-architectural opacity-40 pointer-events-none" />

      {/* Atmospheric Soft Royal Blue Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-electric/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Client-Focused Pre-Footer CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10 border-b border-surface-border">
        <div className="max-w-4xl mx-auto bg-surface-soft border border-surface-border rounded-3xl p-8 sm:p-14 shadow-lg text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-lavender/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium tracking-wider text-lavender bg-lavender/10 border border-lavender/20">
            <span className="w-1.5 h-1.5 rounded-full bg-lavender animate-pulse" />
            <span>SELF-SERVICE PORTAL • INSTANT LIVE CHANGES</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Ready to Update Your{' '}
            <span className="font-editorial italic font-normal text-lavender">
              Physical QR Standee?
            </span>
          </h2>

          <p className="text-sm sm:text-base text-ink-muted max-w-2xl mx-auto leading-relaxed">
            All you need is your QR serial number (printed on your standee or sticker) and your private password. Save your new link in 30 seconds and your physical standee updates immediately.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/update"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-lavender hover:bg-lavender-hover transition-all duration-200 shadow-md shadow-lavender/25 hover:shadow-glow-lavender"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Update My QR/NFC Link Now</span>
            </Link>

            <a
              href="#interactive-demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-ink bg-white hover:bg-slate-100 border border-surface-border shadow-xs transition-all duration-200"
            >
              <span>Test with Simulator</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <img
                src="/logo.png"
                alt="Spread NFC"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-ink-muted max-w-sm leading-relaxed">
              Smart dynamic QR technology for modern businesses. Keep your physical standees and stickers permanent while enjoying complete freedom to update your online links anytime.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-ink-muted">All redirection services fully operational</span>
            </div>
          </div>

          {/* Client Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3.5">Store &amp; Showcase</h4>
            <ul className="space-y-2.5 text-xs text-ink-muted">
              <li>
                <Link to="/products" className="text-lavender hover:text-lavender-hover font-semibold transition-colors flex items-center gap-1.5">
                  <span>Smart Cards &amp; Standees</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-lavender/10 text-lavender font-mono">SHOP</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-lavender transition-colors">
                  Corporate Team Bundles
                </Link>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-lavender transition-colors">
                  How NFC &amp; QR Works
                </a>
              </li>
              <li>
                <a href="/#about" className="hover:text-lavender transition-colors">
                  About the Founder
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-lavender transition-colors">
                  Common Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Client Portal & Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3.5">Helpdesk &amp; Updates</h4>
            <ul className="space-y-2.5 text-xs text-ink-muted">
              <li>
                <Link to="/update" className="text-lavender hover:text-lavender-hover font-semibold transition-colors flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Update Card Link Portal</span>
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-lavender transition-colors font-medium">
                  Support Helpdesk &amp; Ticket Tracking
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-lavender transition-colors">
                  Contact Studio &amp; Enterprise Sales
                </Link>
              </li>
              <li>
                <a href="/#interactive-demo" className="hover:text-lavender transition-colors">
                  Interactive Simulator
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row with ETROMO Branding & Link */}
        <div className="mt-14 pt-8 border-t border-surface-border flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-ink-muted">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-ink font-medium">
              © {new Date().getFullYear()} Spread NFC Dynamic QR Systems. All rights reserved.
            </p>
            <p className="text-ink-muted">
              Instant Camera Scanning • Protected Destination Updates
            </p>
          </div>

          {/* Designed and Developed by ETROMO */}
          <a
            href="https://etromo.in"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-surface-soft border border-surface-border hover:border-electric hover:bg-white transition-all duration-200 shadow-xs"
          >
            <div className="flex flex-col text-right">
              <span className="text-[11px] text-ink-muted group-hover:text-ink transition-colors">
                Designed &amp; Developed by
              </span>
              <span className="text-sm font-extrabold text-ink group-hover:text-electric transition-colors tracking-wider">
                ETROMO
              </span>
              <span className="text-[10px] text-ink-muted group-hover:text-ink transition-colors max-w-xs">
                Engineering intelligent software, digital products, and business systems.
              </span>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-surface-border group-hover:bg-electric group-hover:border-electric text-ink group-hover:text-white transition-all shadow-xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
          </a>
        </div>
      </div>
    </footer>
  )
}
