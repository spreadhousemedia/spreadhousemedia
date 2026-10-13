import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isOfflineMode } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// localStorage keys — use short, stable, brand-neutral keys
const SESSION_KEY = 'spreadnfc_offline_session'
const AUTH_KEY = 'spreadnfc_admin_auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In offline/demo mode, check for persisted offline session
    if (isOfflineMode) {
      const offlineSessionStr = localStorage.getItem(SESSION_KEY)
      if (offlineSessionStr) {
        try {
          const parsed = JSON.parse(offlineSessionStr)
          // Validate it hasn't expired (24h max)
          const savedAt = new Date(parsed.saved_at || 0).getTime()
          if (Date.now() - savedAt < 24 * 60 * 60 * 1000) {
            setSession(parsed.session)
            setLoading(false)
            return
          }
        } catch {
          localStorage.removeItem(SESSION_KEY)
        }
      }
      setLoading(false)
      return
    }

    // Online: use Supabase auth
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    // Offline / demo mode: validate against locally-stored custom credential
    if (isOfflineMode) {
      const storedCredStr = localStorage.getItem(AUTH_KEY)
      let validEmail = 'admin@spreadnfc.in'
      let validPassword = ''

      if (storedCredStr) {
        try {
          const stored = JSON.parse(storedCredStr)
          validEmail = (stored.email || validEmail).toLowerCase()
          validPassword = stored.password || ''
        } catch {
          localStorage.removeItem(AUTH_KEY)
        }
      }

      // If password has been changed by admin, enforce the new password strictly
      let isAuthenticated = false
      if (storedCredStr && validPassword) {
        isAuthenticated = cleanEmail === validEmail && cleanPassword === validPassword
      } else {
        // Initial setup before first password change
        const validEmails = ['admin@spreadnfc.in', 'admin@etromo.in']
        isAuthenticated = validEmails.includes(cleanEmail) && (cleanPassword === 'admin123' || cleanPassword === 'admin')
      }

      if (!isAuthenticated) {
        return { error: 'Invalid email or password.' }
      }

      const mockUser: User = {
        id: 'offline-admin-id',
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: 'Admin' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: cleanEmail,
        role: 'authenticated',
      } as unknown as User

      const mockSession: Session = {
        access_token: 'offline-access-token',
        refresh_token: 'offline-refresh-token',
        expires_in: 86400,
        token_type: 'bearer',
        user: mockUser,
      } as unknown as Session

      localStorage.setItem(SESSION_KEY, JSON.stringify({
        session: mockSession,
        saved_at: new Date().toISOString(),
      }))
      setSession(mockSession)
      return { error: null }
    }

    // Online: Real Supabase sign in
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword })
      return { error: error ? error.message : null }
    } catch {
      return { error: 'Invalid email or password.' }
    }
  }

  async function signOut() {
    localStorage.removeItem(SESSION_KEY)
    if (!isOfflineMode) {
      try {
        await supabase.auth.signOut()
      } catch {}
    }
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
