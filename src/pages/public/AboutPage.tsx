import { Link } from 'react-router-dom'
import { Navbar } from '../../components/landing/Navbar'
import { AboutFounderSection } from '../../components/landing/AboutFounderSection'
import { ArchitectureSecurity } from '../../components/landing/ArchitectureSecurity'
import { CtaFooter } from '../../components/landing/CtaFooter'

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-ink flex flex-col selection:bg-electric selection:text-white">
      <Navbar />
      <main className="flex-1 pt-24">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 text-center space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-electric font-bold">
            About Spread NFC · spreadnfc.in
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink">
            Permanent Smart NFC &amp; Dynamic QR Infrastructure
          </h1>
          <p className="text-sm sm:text-base text-ink-muted max-w-2xl mx-auto leading-relaxed">
            Spread NFC (operated by ETROMO) builds durable NFC business cards, contactless acrylic standees, and server-verified dynamic QR redirection tools for creators and enterprises across India.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold">
            <Link to="/products" className="rounded-xl bg-electric px-4 py-2.5 text-white hover:bg-electric-hover">
              Explore Products
            </Link>
            <Link to="/contact" className="rounded-xl border border-surface-border px-4 py-2.5 text-ink hover:bg-surface-subtle">
              Contact Sales
            </Link>
            <a href="mailto:contact@spreadnfc.in" className="rounded-xl border border-surface-border px-4 py-2.5 text-ink font-mono hover:bg-surface-subtle">
              contact@spreadnfc.in
            </a>
          </div>
        </section>

        <AboutFounderSection />
        <ArchitectureSecurity />
      </main>
      <CtaFooter />
    </div>
  )
}

