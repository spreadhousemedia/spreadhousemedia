import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/Spinner'
import { getCached, setCached } from '../../lib/cache'

type ViewState = 'loading' | 'not_found' | 'inactive' | 'redirecting' | 'setup' | 'error'

export function QRRedirect() {
  const { qrNumber } = useParams<{ qrNumber: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<ViewState>('loading')

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!qrNumber) {
        setState('not_found')
        return
      }

      const normQr = qrNumber.toUpperCase().trim()

      // 1. Instant Cache Check (sub-millisecond instant redirect for repeated visits/scans)
      const cachedUrl = getCached<string>(`redirect_${normQr}`)
      if (cachedUrl) {
        setState('redirecting')
        window.location.replace(cachedUrl)
        return
      }

      // 2. Fetch destination from database
      const { data, error } = await supabase.rpc('get_qr_redirect', { p_qr_number: normQr })
      if (cancelled) return

      if (error) {
        setState('error')
        return
      }

      if (!data || data.length === 0) {
        setState('not_found')
        return
      }

      const row = data[0] as { status: string; destination_url: string | null }
      if (row.status !== 'active') {
        setState('inactive')
        return
      }

      // First scan of a freshly created / unlinked QR: no destination has been set yet.
      // Route scanner straight to the First-Time Activation flow!
      if (!row.destination_url || row.destination_url.trim().length === 0) {
        setState('setup')
        setTimeout(() => {
          if (!cancelled) {
            navigate(`/update?qr=${encodeURIComponent(normQr)}`, { replace: true })
          }
        }, 500)
        return
      }

      // Existing QR code: cache for 30s TTL and redirect immediately WITHOUT login
      setCached(`redirect_${normQr}`, row.destination_url, 30_000)
      setState('redirecting')
      window.location.replace(row.destination_url)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [qrNumber, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-ghost px-4">
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-white p-8 text-center shadow-sm">
        {(state === 'loading' || state === 'redirecting') && (
          <>
            <Spinner size={32} className="mx-auto text-lavender" />
            <p className="mt-4 text-sm font-medium text-gray-600">Connecting to destination…</p>
          </>
        )}
        {state === 'setup' && (
          <>
            <Spinner size={32} className="mx-auto text-lavender" />
            <p className="mt-4 text-sm font-medium text-gray-600">Setting up your new device…</p>
          </>
        )}
        {state === 'not_found' && (
          <>
            <IconCircle tone="red">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </IconCircle>
            <h1 className="mt-4 text-lg font-semibold text-gray-900">Device Not Found</h1>
            <p className="mt-2 text-sm text-gray-500">
              QR code <span className="font-mono font-bold">{qrNumber}</span> is not registered. Please check the QR code number and try again.
            </p>
          </>
        )}
        {state === 'inactive' && (
          <>
            <IconCircle tone="gray">
              <circle cx="12" cy="12" r="10" />
              <path d="M4.9 4.9l14.2 14.2" strokeLinecap="round" />
            </IconCircle>
            <h1 className="mt-4 text-lg font-semibold text-gray-900">Card / Standee Inactive</h1>
            <p className="mt-2 text-sm text-gray-500">Please contact the administrator or support.</p>
          </>
        )}
        {state === 'error' && (
          <>
            <IconCircle tone="red">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </IconCircle>
            <h1 className="text-lg font-semibold text-gray-900">Service Unavailable</h1>
            <p className="mt-2 text-sm text-gray-500">
              Could not connect to the QR service. Please try again in a moment.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function IconCircle({ tone, children }: { tone: 'red' | 'gray'; children: React.ReactNode }) {
  const colors = tone === 'red' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
  return (
    <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${colors}`}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {children}
      </svg>
    </span>
  )
}
