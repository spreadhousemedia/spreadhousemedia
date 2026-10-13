import { useState, type FormEvent } from 'react'
import { KeyRound, X, Check, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'
import { supabase, isOfflineMode } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Spinner'

interface ChangePasswordModalProps {
  onClose: () => void
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { user } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Complexity Checks
  const hasMinLength = newPassword.length >= 8
  const hasUpper = /[A-Z]/.test(newPassword)
  const hasLower = /[a-z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword

  const passedCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length

  let strengthLabel = 'Too Weak'
  let strengthColor = 'bg-rose-500'
  if (passedCount >= 5 && hasMinLength) {
    strengthLabel = 'Strong'
    strengthColor = 'bg-emerald-500'
  } else if (passedCount >= 3) {
    strengthLabel = 'Medium'
    strengthColor = 'bg-amber-500'
  } else if (passedCount >= 1) {
    strengthLabel = 'Weak'
    strengthColor = 'bg-orange-500'
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!hasMinLength) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!hasUpper || !hasLower || !hasNumber) {
      setError('Password must contain uppercase letters, lowercase letters, and numbers.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // 1. Update in Supabase Auth if online
      if (!isOfflineMode) {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        })
        if (updateError) {
          setError(updateError.message || 'Could not update password. Please re-authenticate.')
          setLoading(false)
          return
        }
      }

      // 2. Also persist in local admin credentials store for offline/demo reliability
      const currentEmail = user?.email || 'admin@spreadnfc.in'
      localStorage.setItem(
        'spreadnfc_admin_auth',
        JSON.stringify({
          email: currentEmail,
          password: newPassword,
          updated_at: new Date().toISOString(),
        })
      )

      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        onClose()
      }, 1800)
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="theme-card w-full max-w-md rounded-2xl border p-6 sm:p-7 shadow-2xl transition-all relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="theme-border flex items-start justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200/60">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="theme-text-main text-base sm:text-lg font-bold">Change Admin Password</h3>
              <p className="theme-text-muted text-xs">Update your credentials to secure admin access.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="theme-text-muted hover:text-zinc-900 rounded-lg p-1.5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h4 className="theme-text-main text-base font-bold">Password Updated Successfully</h4>
            <p className="theme-text-muted text-xs max-w-xs mx-auto">
              Your admin password has been changed. Use your new password on your next login.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Signed In As */}
            <div className="theme-subtle rounded-xl p-3 border text-xs flex items-center justify-between">
              <span className="theme-text-muted">Account Email:</span>
              <span className="theme-text-main font-mono font-semibold">{user?.email || 'admin@spreadnfc.in'}</span>
            </div>

            {/* New Password */}
            <div>
              <label className="theme-text-main mb-1.5 block text-xs font-semibold uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="theme-input w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="theme-text-muted hover:text-zinc-800 absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Strength Meter Bar */}
            {newPassword.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="theme-text-muted">Password Strength:</span>
                  <span className="font-semibold theme-text-main">{strengthLabel}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strengthColor}`}
                    style={{ width: `${Math.min(100, (passedCount / 5) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Confirm New Password */}
            <div>
              <label className="theme-text-main mb-1.5 block text-xs font-semibold uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="theme-input w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="theme-text-muted hover:text-zinc-800 absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !isMatching && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">Passwords do not match</p>
              )}
            </div>

            {/* Password Criteria Checklist */}
            <div className="theme-subtle rounded-xl p-3 border space-y-1.5 text-[11px]">
              <span className="theme-text-muted font-bold block mb-1 uppercase tracking-wider text-[10px]">
                Security Requirements:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'theme-text-muted'}`}>
                  <Check className={`h-3 w-3 ${hasMinLength ? 'text-emerald-600' : 'opacity-40'}`} />
                  At least 8 characters
                </span>
                <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-medium' : 'theme-text-muted'}`}>
                  <Check className={`h-3 w-3 ${hasUpper ? 'text-emerald-600' : 'opacity-40'}`} />
                  1 uppercase letter (A-Z)
                </span>
                <span className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-medium' : 'theme-text-muted'}`}>
                  <Check className={`h-3 w-3 ${hasLower ? 'text-emerald-600' : 'opacity-40'}`} />
                  1 lowercase letter (a-z)
                </span>
                <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : 'theme-text-muted'}`}>
                  <Check className={`h-3 w-3 ${hasNumber ? 'text-emerald-600' : 'opacity-40'}`} />
                  1 number (0-9)
                </span>
                <span className={`flex items-center gap-1.5 col-span-2 ${hasSpecial ? 'text-emerald-700 font-medium' : 'theme-text-muted'}`}>
                  <Check className={`h-3 w-3 ${hasSpecial ? 'text-emerald-600' : 'opacity-40'}`} />
                  1 special character (!@#$%^&*)
                </span>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="theme-subtle rounded-xl border px-4 py-2 text-xs font-semibold theme-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !hasMinLength || !isMatching}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-md shadow-brand-600/20 disabled:opacity-50 transition-colors"
              >
                {loading && <Spinner size={14} />}
                <span>Save New Password</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
