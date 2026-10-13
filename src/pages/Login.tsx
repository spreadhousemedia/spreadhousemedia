import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/Spinner'

export function Login() {
  const { user, loading: authLoading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && user) {
    const from = (location.state as { from?: Location })?.from?.pathname || '/admin'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError('Invalid email or password.')
      return
    }
    navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft px-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-electric/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-lavender/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-white p-8 sm:p-9 shadow-xl relative z-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link to="/" className="mb-4 inline-block transition-transform duration-200 hover:scale-105" title="Spread NFC Home">
            <img src="/logo.png" alt="Spread NFC" className="h-9 w-auto object-contain" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide text-electric bg-electric/10 border border-electric/20 mb-2">
            ADMIN PORTAL
          </div>
          <p className="text-xs text-ink-muted">Sign in to manage your dynamic QR ecosystem.</p>
        </div>


        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-surface-border px-3.5 py-2.5 text-sm text-ink focus:border-electric focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-surface-border px-3.5 py-2.5 text-sm text-ink focus:border-electric focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs text-rose-700 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 py-3 text-sm font-bold text-white hover:bg-electric-hover shadow-md transition-all duration-200 disabled:opacity-60"
          >
            {submitting && <Spinner size={16} />}
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-surface-border text-center">
          <a
            href="https://etromo.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <span>Developed by</span>
            <span className="font-bold text-ink hover:text-electric transition-colors">ETROMO</span>
            <span className="font-mono text-[10px] text-ink-muted">(etromo.in)</span>
          </a>
        </div>
      </div>
    </div>
  )
}
