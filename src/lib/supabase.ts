import { createClient } from '@supabase/supabase-js'
import { mockDb, type MockQr } from './mockDb'

const envUrl = import.meta.env.VITE_SUPABASE_URL || ''
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if app is in Offline/Demo mode
// Safe to read localStorage here — this is a browser-only module loaded after DOM is ready
function computeOfflineMode(): boolean {
  try {
    const isPlaceholderUrl =
      !envUrl ||
      envUrl.includes('placeholder') ||
      envUrl.includes('your-project') ||
      envUrl === 'https://your-project.supabase.co'
    const isPlaceholderKey =
      !envAnonKey ||
      envAnonKey.includes('your-anon-key') ||
      envAnonKey === 'your-anon-key'
    // Only use offline mode if BOTH credentials are placeholders OR explicit opt-in
    const explicitOffline = localStorage.getItem('spreadnfc_offline_mode') === 'true'
    return (isPlaceholderUrl && isPlaceholderKey) || explicitOffline
  } catch {
    // localStorage may be unavailable in some sandboxed environments
    return (
      !envUrl ||
      envUrl.includes('placeholder') ||
      envUrl.includes('your-project') ||
      envUrl === 'https://your-project.supabase.co'
    )
  }
}

export const isOfflineMode = computeOfflineMode()

const realClient = createClient(
  envUrl && !envUrl.includes('your-project') ? envUrl : 'https://placeholder.supabase.co',
  envAnonKey && !envAnonKey.includes('your-anon-key') ? envAnonKey : 'placeholder-anon-key',
)

// Helper to attach batch name to a QR record
function attachBatch(qr: MockQr) {
  const batches = mockDb.getBatches()
  const b = batches.find((item) => item.id === qr.batch_id)
  return {
    ...qr,
    batches: b ? { batch_name: b.batch_name } : null,
  }
}

/**
 * High-performance query builder for offline mock operations.
 * Implements the exact chaining API of Supabase PostgREST client.
 */
class MockQueryBuilder {
  private table: string
  private filters: ((item: any) => boolean)[] = []
  private sortKey = 'created_at'
  private sortAsc = false
  private rangeFrom = 0
  private rangeTo = 999999
  private updatePayload: any = null
  private isDelete = false

  constructor(table: string) {
    this.table = table
  }

  select(_columns?: string, _options?: { count?: string; head?: boolean }) {
    return this
  }

  limit(count: number) {
    this.rangeTo = this.rangeFrom + count - 1
    return this
  }

  or(filterString: string) {
    // e.g. qr_number.ilike.%term%,qr_name.ilike.%term%,destination_url.ilike.%term%
    const match = filterString.match(/ilike\.%([^%]+)%/i)
    if (match && match[1]) {
      const term = match[1].toLowerCase()
      this.filters.push((row: any) => {
        const num = (row.qr_number || '').toLowerCase()
        const name = (row.qr_name || '').toLowerCase()
        const url = (row.destination_url || '').toLowerCase()
        return num.includes(term) || name.includes(term) || url.includes(term)
      })
    }
    return this
  }

  eq(column: string, value: any) {
    this.filters.push((row: any) => row[column] === value)
    return this
  }

  in(column: string, values: any[]) {
    const valSet = new Set(values)
    this.filters.push((row: any) => valSet.has(row[column]))
    return this
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && value === null) {
      this.filters.push((row: any) => {
        const val = row[column]
        return val !== null && val !== undefined && val !== ''
      })
    } else if (operator === 'eq') {
      this.filters.push((row: any) => row[column] !== value)
    } else {
      this.filters.push((row: any) => row[column] !== value)
    }
    return this
  }

  is(column: string, value: any) {
    if (value === null) {
      this.filters.push((row: any) => {
        const val = row[column]
        return val === null || val === undefined || val === ''
      })
    } else {
      this.filters.push((row: any) => row[column] === value)
    }
    return this
  }

  neq(column: string, value: any) {
    this.filters.push((row: any) => row[column] !== value)
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortKey = column
    this.sortAsc = options?.ascending ?? true
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  update(payload: any) {
    this.updatePayload = payload
    return this
  }

  delete() {
    this.isDelete = true
    return this
  }

  async then(resolve: (value: any) => void) {
    if (this.table === 'batches') {
      let data = mockDb.getBatches()
      data.sort((a, b) => a.batch_name.localeCompare(b.batch_name))
      return resolve({ data, count: data.length, error: null })
    }

    if (this.table === 'qr_codes') {
      let qrs = mockDb.getQrs()

      // Handle DELETE mutation
      if (this.isDelete) {
        const remaining = qrs.filter((row) => !this.filters.every((f) => f(row)))
        mockDb.saveQrs(remaining)
        return resolve({ data: null, error: null })
      }

      // Handle UPDATE mutation
      if (this.updatePayload) {
        qrs = qrs.map((row) => {
          if (this.filters.every((f) => f(row))) {
            return { ...row, ...this.updatePayload, updated_at: new Date().toISOString() }
          }
          return row
        })
        mockDb.saveQrs(qrs)
        return resolve({ data: null, error: null })
      }

      // Handle SELECT queries
      let filtered = qrs.filter((row) => this.filters.every((f) => f(row)))
      const totalCount = filtered.length

      filtered.sort((a: any, b: any) => {
        const valA = a[this.sortKey] ?? ''
        const valB = b[this.sortKey] ?? ''
        if (valA < valB) return this.sortAsc ? -1 : 1
        if (valA > valB) return this.sortAsc ? 1 : -1
        return 0
      })

      const paginated = filtered.slice(this.rangeFrom, this.rangeTo + 1).map(attachBatch)

      return resolve({
        data: paginated,
        count: totalCount,
        error: null,
      })
    }

    return resolve({ data: [], count: 0, error: null })
  }
}

// Proxied Supabase Client that seamlessly handles Offline / Local mode
export const supabase = {
  ...realClient,

  from(table: string): any {
    if (isOfflineMode) {
      return new MockQueryBuilder(table)
    }
    return realClient.from(table)
  },

  async rpc(name: string, params?: any) {
    if (isOfflineMode) {
      switch (name) {
        case 'admin_create_single_qr':
          return mockDb.createSingleQr(params)
        case 'admin_create_batch':
          return mockDb.createBatch(params)
        case 'admin_process_qr_csv':
          return mockDb.processCsv(params)
        case 'admin_reset_qr_password':
          return mockDb.resetPassword(params)
        case 'request_qr_update':
          return mockDb.requestQrUpdate(params)
        case 'confirm_qr_update':
          return mockDb.confirmQrUpdate(params)
        case 'get_qr_redirect':
          return mockDb.getQrRedirect(params)
        default:
          return { data: { ok: true }, error: null }
      }
    }

    // Try real Supabase; do NOT fall back to mockDb on network failures for live site.
    // A production network failure should surface as an error, not silently serve
    // stale localStorage data that has no real QR records.
    try {
      const res = await realClient.rpc(name, params)
      return res
    } catch {
      return { data: null, error: { message: 'Database connection failed. Please check your internet connection and try again.' } }
    }
  },
}
