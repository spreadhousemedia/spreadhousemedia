import type { MultiQrSummaryItem } from '../types'

const VAULT_STORAGE_KEY = 'spreadnfc_multi_qr_vault_v1'
const SINGLE_SESSION_PREFIX = 'spreadnfc_customer_session_'

export interface MultiQrVaultEntry {
  qrNumber: string
  sessionToken: string
  label?: string
  addedAt: string
}

function normalizeQr(qr: string): string {
  return qr.trim().toUpperCase()
}

export function getStoredSingleSession(qrNumber: string): string | null {
  try {
    return sessionStorage.getItem(`${SINGLE_SESSION_PREFIX}${normalizeQr(qrNumber)}`)
  } catch {
    return null
  }
}

export function setStoredSingleSession(qrNumber: string, token: string): void {
  try {
    sessionStorage.setItem(`${SINGLE_SESSION_PREFIX}${normalizeQr(qrNumber)}`, token)
  } catch {
    // ignore storage errors
  }
}

export function clearStoredSingleSession(qrNumber: string): void {
  try {
    sessionStorage.removeItem(`${SINGLE_SESSION_PREFIX}${normalizeQr(qrNumber)}`)
  } catch {
    // ignore storage errors
  }
}

export function listMultiQrVault(): MultiQrVaultEntry[] {
  try {
    const raw = sessionStorage.getItem(VAULT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is MultiQrVaultEntry =>
        Boolean(item && typeof item.qrNumber === 'string' && typeof item.sessionToken === 'string'),
    )
  } catch {
    return []
  }
}

function saveMultiQrVault(entries: MultiQrVaultEntry[]): void {
  try {
    sessionStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(entries.slice(0, 25)))
  } catch {
    // ignore storage errors
  }
}

/**
 * Registers an already-authenticated QR session token into the customer's Multi-QR Workspace.
 * Never stores passwords; only stores short-lived server-issued session tokens in sessionStorage.
 */
export function registerQrSessionInVault(
  qrNumber: string,
  sessionToken: string,
  label?: string,
): MultiQrVaultEntry[] {
  const norm = normalizeQr(qrNumber)
  if (!norm || !sessionToken) return listMultiQrVault()

  setStoredSingleSession(norm, sessionToken)

  const current = listMultiQrVault()
  const existing = current.find((e) => e.qrNumber === norm)
  const nextEntry: MultiQrVaultEntry = {
    qrNumber: norm,
    sessionToken,
    label: label?.trim() || existing?.label,
    addedAt: existing?.addedAt || new Date().toISOString(),
  }

  const next = [nextEntry, ...current.filter((e) => e.qrNumber !== norm)]
  saveMultiQrVault(next)
  return next
}

export function updateQrLabelInVault(qrNumber: string, label: string): MultiQrVaultEntry[] {
  const norm = normalizeQr(qrNumber)
  const cleanLabel = label.trim().slice(0, 40)
  const next = listMultiQrVault().map((entry) =>
    entry.qrNumber === norm ? { ...entry, label: cleanLabel || undefined } : entry,
  )
  saveMultiQrVault(next)
  return next
}

export function removeQrFromVault(qrNumber: string): MultiQrVaultEntry[] {
  const norm = normalizeQr(qrNumber)
  clearStoredSingleSession(norm)
  const next = listMultiQrVault().filter((e) => e.qrNumber !== norm)
  saveMultiQrVault(next)
  return next
}

export function clearAllMultiQrVaultSessions(): void {
  const entries = listMultiQrVault()
  for (const e of entries) {
    clearStoredSingleSession(e.qrNumber)
  }
  try {
    sessionStorage.removeItem(VAULT_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Prunes any locally cached entries whose server session has expired or been revoked.
 */
export function syncVaultWithServerSummaries(validItems: MultiQrSummaryItem[]): MultiQrSummaryItem[] {
  const validByQr = new Map(validItems.map((item) => [normalizeQr(item.qr_number), item]))
  const current = listMultiQrVault()

  const pruned: MultiQrVaultEntry[] = []
  for (const entry of current) {
    const match = validByQr.get(normalizeQr(entry.qrNumber))
    if (match) {
      pruned.push(entry)
    } else {
      clearStoredSingleSession(entry.qrNumber)
    }
  }
  saveMultiQrVault(pruned)

  const labelMap = new Map(pruned.map((e) => [normalizeQr(e.qrNumber), e.label]))
  return validItems.map((item) => ({
    ...item,
    label: labelMap.get(normalizeQr(item.qr_number)) ?? item.label,
  }))
}

