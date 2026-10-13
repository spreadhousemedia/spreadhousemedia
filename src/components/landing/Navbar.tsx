import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'About', href: '/#about' },
    { name: 'Support', href: '/support' },
    { name: 'Contact', href: '/contact' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    if (href.startsWith('/#')) return false
    return location.pathname.startsWith(href)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-surface-border shadow-xs py-3'
          : 'bg-white/80 backdrop-blur-sm border-b border-surface-border/60 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Spread NFC"
              className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return link.href.startsWith('/#') ? (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`transition-colors ${
                    active ? 'text-electric font-bold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </nav>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-5 rounded-2xl bg-white border border-surface-border shadow-xl space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return link.href.startsWith('/#') ? (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm font-semibold text-ink-muted hover:text-ink py-1.5"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-sm py-1.5 ${
                    active ? 'text-electric font-bold' : 'font-semibold text-ink-muted hover:text-ink'
                  }`}
                >
                  {link.name}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}

