import type { QrStatus } from '../types'

export function StatusBadge({
  status,
  hasDestination = true,
}: {
  status: QrStatus
  hasDestination?: boolean
}) {
  if (status === 'inactive') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-rose-50 text-rose-700 border-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Disabled
      </span>
    )
  }

  if (!hasDestination) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200/80 shadow-2xs">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Pending Link
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
      Active
    </span>
  )
}
