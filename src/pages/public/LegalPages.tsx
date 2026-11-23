import { Link } from 'react-router-dom'
import { Navbar } from '../../components/landing/Navbar'
import { CtaFooter } from '../../components/landing/CtaFooter'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-ink flex flex-col selection:bg-electric selection:text-white">
      <Navbar />
      <main className="flex-1 pt-28 pb-20">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <header className="space-y-2 border-b border-surface-border pb-6">
            <p className="text-xs font-mono uppercase tracking-widest text-electric font-bold">Legal · Privacy</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              Privacy Policy
            </h1>
            <p className="text-xs text-ink-muted font-mono">Effective Date: November 2026 · spreadnfc.in</p>
          </header>

          <section className="space-y-3 text-sm text-ink-muted leading-relaxed">
            <h2 className="text-lg font-bold text-ink">1. Information We Collect</h2>
            <p>
              Spread NFC collects only the details required to provision, secure, and operate your NFC smart cards, QR standees, and digital profiles—such as your QR serial number, profile display information, destination links, and optional order/support contact details (name, email, phone number).
            </p>
          </section>

          <section className="space-y-3 text-sm text-ink-muted leading-relaxed">
            <h2 className="text-lg font-bold text-ink">2. Security &amp; Access Control</h2>
            <p>
              Passwords and packaging setup codes are hashed server-side using bcrypt (`pgcrypto`). Customer editing sessions use short-lived cryptographic tokens stored only for the active session, and database tables are protected with PostgreSQL Row-Level Security (RLS). Personal profile contact emails are never exposed on public profile views.
            </p>
          </section>

          <section className="space-y-3 text-sm text-ink-muted leading-relaxed">
            <h2 className="text-lg font-bold text-ink">3. Contact &amp; Data Requests</h2>
            <p>
              To request updates, password resets, or deletion of your stored profile or inquiry data, contact{' '}
              <a href="mailto:contact@spreadnfc.in" className="text-electric font-mono underline">
                contact@spreadnfc.in
              </a>{' '}
              or call{' '}
              <a href="tel:+919351042276" className="text-electric font-mono underline">
                +91 93510 42276
              </a>
              .
            </p>
          </section>

          <div className="pt-4 flex gap-4 text-xs font-semibold">
            <Link to="/terms" className="text-electric hover:underline">Read Terms of Service →</Link>
            <Link to="/support" className="text-ink-muted hover:text-ink">Support Helpdesk</Link>
          </div>
        </article>
      </main>
      <CtaFooter />
    </div>
  )
}

export function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-ink flex flex-col selection:bg-electric selection:text-white">
      <Navbar />
      <main className="flex-1 pt-28 pb-20">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <header className="space-y-2 border-b border-surface-border pb-6">
            <p className="text-xs font-mono uppercase tracking-widest text-electric font-bold">Legal · Terms</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              Terms of Service
            </h1>
            <p className="text-xs text-ink-muted font-mono">Effective Date: November 2026 · spreadnfc.in</p>
          </header>

          <section className="space-y-3 text-sm text-ink-muted leading-relaxed">
            <h2 className="text-lg font-bold text-ink">1. Service Scope</h2>
            <p>
              Spread NFC provides physical NFC/QR hardware products alongside dynamic URL redirection and digital profile hosting on spreadnfc.in. Cardholders are responsible for ensuring their destination links comply with applicable laws and contain only safe public web destinations.
            </p>
          </section>

          <section className="space-y-3 text-sm text-ink-muted leading-relaxed">
            <h2 className="text-lg font-bold text-ink">2. Acceptable Use</h2>
            <p>
              Malicious, phishing, deceptive, or local/private-network redirect targets are strictly prohibited and automatically blocked. Spread NFC reserves the right to deactivate QR codes linked to abusive or unlawful content.
            </p>
          </section>

          <section className="space-y-3 text-sm text-ink-muted leading-relaxed">
            <h2 className="text-lg font-bold text-ink">3. Orders, Customization &amp; Support</h2>
            <p>
              Custom-engraved NFC cards and acrylic standees enter production once order details are verified. Hardware or redirection assistance is available through{' '}
              <Link to="/support" className="text-electric underline">spreadnfc.in/support</Link> or{' '}
              <a href="mailto:contact@spreadnfc.in" className="text-electric font-mono underline">
                contact@spreadnfc.in
              </a>
              .
            </p>
          </section>

          <div className="pt-4 flex gap-4 text-xs font-semibold">
            <Link to="/privacy" className="text-electric hover:underline">Read Privacy Policy →</Link>
            <Link to="/contact" className="text-ink-muted hover:text-ink">Contact Us</Link>
          </div>
        </article>
      </main>
      <CtaFooter />
    </div>
  )
}

