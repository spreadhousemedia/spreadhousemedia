import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ghost px-4 text-center">
      <Link to="/" className="mb-2 inline-block transition-transform hover:scale-105">
        <img src="/logo.png" alt="Spread NFC" className="h-8 w-auto object-contain" />
      </Link>
      <h1 className="text-2xl font-bold text-ink">Page Not Found</h1>
      <p className="text-sm text-ink-muted">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-electric hover:bg-electric-hover transition-colors shadow-xs">
        Return Home
      </Link>
    </div>
  )
}
