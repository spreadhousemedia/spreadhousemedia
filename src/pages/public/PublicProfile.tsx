import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, EyeOff, PowerOff } from 'lucide-react'
import { getCached, setCached } from '../../lib/cache'
import { fetchPublicProfile, type GetPublicProfileRpcResult } from '../../lib/profileApi'
import { Spinner } from '../../components/Spinner'
import { PublicProfileView } from '../../components/profile/PublicProfileView'
import type { PublicLinkItem, PublicProfileData } from '../../types'

type ProfileViewState =
  | { kind: 'loading' }
  | { kind: 'ready'; qrNumber: string; profile: PublicProfileData; links: PublicLinkItem[] }
  | { kind: 'draft'; qrNumber: string }
  | { kind: 'inactive' }
  | { kind: 'not_found' }
  | { kind: 'error' }

export function PublicProfile() {
  const { identifier } = useParams<{ identifier: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<ProfileViewState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      if (!identifier) {
        setState({ kind: 'not_found' })
        return
      }

      const cacheKey = `profile_${identifier.trim().toLowerCase()}`
      const cached = getCached<GetPublicProfileRpcResult>(cacheKey)
      if (cached && cached.ok && cached.is_published && cached.profile) {
        setState({
          kind: 'ready',
          qrNumber: cached.qr_number || identifier,
          profile: cached.profile,
          links: cached.links ?? [],
        })
      } else {
        setState({ kind: 'loading' })
      }

      const { data: res, error } = await fetchPublicProfile(identifier)
      if (cancelled) return

      if (error || !res) {
        setState({ kind: 'error' })
        return
      }

      if (!res.ok) {
        if (res.error === 'inactive') {
          setState({ kind: 'inactive' })
          return
        }
        if (res.error === 'not_personal_profile' && res.qr_number) {
          navigate(`/q/${encodeURIComponent(res.qr_number)}`, { replace: true })
          return
        }
        setState({ kind: 'not_found' })
        return
      }

      if (!res.is_published || !res.profile) {
        setState({ kind: 'draft', qrNumber: res.qr_number || identifier })
        return
      }

      setCached(cacheKey, res, 15_000)
      setState({
        kind: 'ready',
        qrNumber: res.qr_number || identifier,
        profile: res.profile,
        links: res.links ?? [],
      })
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [identifier, navigate])

  if (state.kind === 'ready') {
    return (
      <PublicProfileView
        profile={state.profile}
        links={state.links}
        qrNumber={state.qrNumber}
      />
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3] px-4">
      <div className="w-full max-w-sm rounded-[24px] border border-[#E6E4DF] bg-white p-8 text-center shadow-[0_2px_12px_rgba(20,20,19,0.04)]">
        {state.kind === 'loading' && (
          <>
            <Spinner size={26} className="mx-auto text-[#5E4AE3]" />
            <p className="mt-4 text-sm font-medium text-[#5C5B57]">Loading digital profile…</p>
          </>
        )}

        {state.kind === 'draft' && (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F6F3] text-[#5C5B57] border border-[#E6E4DF]">
              <EyeOff className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-lg font-bold tracking-tight text-[#141413]">Profile Setup in Progress</h1>
            <p className="mt-2 text-xs sm:text-sm text-[#5C5B57] leading-relaxed">
              The owner of <span className="font-mono font-semibold text-[#141413]">{state.qrNumber}</span> has not published their public profile yet.
            </p>
            <Link
              to={`/update?qr=${encodeURIComponent(state.qrNumber)}`}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#141413] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2A2A28] transition-colors"
            >
              Are you the owner? Manage Profile
            </Link>
          </>
        )}

        {state.kind === 'inactive' && (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F6F3] text-[#5C5B57] border border-[#E6E4DF]">
              <PowerOff className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-lg font-bold tracking-tight text-[#141413]">Card / Profile Inactive</h1>
            <p className="mt-2 text-sm text-[#5C5B57]">
              This SpreadNFC card is currently disabled. Please contact support for assistance.
            </p>
          </>
        )}

        {state.kind === 'not_found' && (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-lg font-bold tracking-tight text-[#141413]">Profile Not Found</h1>
            <p className="mt-2 text-sm text-[#5C5B57]">
              We couldn&apos;t find a digital profile matching <span className="font-mono font-semibold text-[#141413]">{identifier}</span>.
            </p>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-lg font-bold tracking-tight text-[#141413]">Service Unavailable</h1>
            <p className="mt-2 text-sm text-[#5C5B57]">
              Could not load this profile right now. Please try again in a moment.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
