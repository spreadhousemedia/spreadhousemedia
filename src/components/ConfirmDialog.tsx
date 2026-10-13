import { AlertTriangle, Trash2, X } from 'lucide-react'
import { Spinner } from './Spinner'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="theme-card w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              danger
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                : 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
            }`}
          >
            {danger ? <AlertTriangle className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="theme-text-main text-base font-semibold leading-6">{title}</h3>
            <p className="theme-text-muted mt-1 text-sm">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="theme-text-muted hover:text-white rounded-lg p-1 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="theme-subtle w-full sm:w-auto rounded-xl border px-4 py-2.5 text-sm font-medium theme-hover disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition-colors ${
              danger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
            }`}
          >
            {loading && <Spinner size={14} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
