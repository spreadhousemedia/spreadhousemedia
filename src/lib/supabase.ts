import { mockDb, type MockQr } from './mockDb'

// Check if app is explicitly in local Offline/Demo mode
function computeOfflineMode(): boolean {
  try {
    return localStorage.getItem('spreadnfc_offline_mode') === 'true'
  } catch {
    return false
  }
}

export const isOfflineMode = computeOfflineMode()

function attachBatchAndProfile(qr: MockQr) {
  const batches = mockDb.getBatches()
  const b = batches.find((item) => item.id === qr.batch_id)
  const profile = mockDb.getProfiles().find((p) => p.qr_code_id === qr.id)
  const links = profile ? mockDb.getLinks().filter((l) => l.qr_profile_id === profile.id) : []
  return {
    ...qr,
    batches: b ? { batch_name: b.batch_name } : null,
    qr_profiles: profile
      ? {
          id: profile.id,
          public_slug: profile.public_slug,
          is_published: profile.is_published,
          profile_name: profile.profile_name,
          theme: profile.theme,
          qr_links: links.map((l) => ({ id: l.id, is_active: l.is_active })),
        }
      : null,
  }
}

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
      const data = mockDb.getBatches()
      data.sort((a, b) => a.batch_name.localeCompare(b.batch_name))
      return resolve({ data, count: data.length, error: null })
    }

    if (this.table === 'qr_codes') {
      let qrs = mockDb.getQrs()
      if (this.isDelete) {
        const remaining = qrs.filter((row) => !this.filters.every((f) => f(row)))
        mockDb.saveQrs(remaining)
        return resolve({ data: null, error: null })
      }
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

      const filtered = qrs.filter((row) => this.filters.every((f) => f(row)))
      const totalCount = filtered.length
      filtered.sort((a: any, b: any) => {
        const valA = a[this.sortKey] ?? ''
        const valB = b[this.sortKey] ?? ''
        if (valA < valB) return this.sortAsc ? -1 : 1
        if (valA > valB) return this.sortAsc ? 1 : -1
        return 0
      })

      const paginated = filtered.slice(this.rangeFrom, this.rangeTo + 1).map(attachBatchAndProfile)
      return resolve({ data: paginated, count: totalCount, error: null })
    }

    if (this.table === 'qr_profiles') {
      const profiles = mockDb.getProfiles()
      const filtered = profiles.filter((row) => this.filters.every((f) => f(row)))
      return resolve({ data: filtered, count: filtered.length, error: null })
    }

    if (this.table === 'qr_links') {
      const links = mockDb.getLinks()
      const filtered = links.filter((row) => this.filters.every((f) => f(row)))
      return resolve({ data: filtered, count: filtered.length, error: null })
    }

    return resolve({ data: [], count: 0, error: null })
  }
}

type FilterSpec =
  | { op: 'eq' | 'neq' | 'is'; column: string; value: unknown }
  | { op: 'not'; column: string; operator: string; value: unknown }
  | { op: 'in'; column: string; values: unknown[] }
  | { op: 'or'; value: string }

/**
 * Server-proxied query builder: executes all table reads/writes via /api/db
 * so zero database URLs or API keys are ever exposed in the client bundle.
 */
class ServerApiQueryBuilder {
  private table: string
  private action: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select'
  private columns = '*'
  private countMode: 'exact' | undefined
  private headOnly = false
  private filters: FilterSpec[] = []
  private orderSpec: { column: string; ascending: boolean } | undefined
  private limitVal: number | undefined
  private rangeSpec: { from: number; to: number } | undefined
  private bodyPayload: unknown = undefined
  private onConflictCol: string | undefined

  constructor(table: string) {
    this.table = table
  }

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    if (this.action === 'select') {
      this.columns = columns
      this.countMode = options?.count
      this.headOnly = Boolean(options?.head)
    }
    return this
  }

  insert(payload: unknown) {
    this.action = 'insert'
    this.bodyPayload = payload
    return this
  }

  upsert(payload: unknown, options?: { onConflict?: string }) {
    this.action = 'upsert'
    this.bodyPayload = payload
    this.onConflictCol = options?.onConflict
    return this
  }

  update(payload: unknown) {
    this.action = 'update'
    this.bodyPayload = payload
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push({ op: 'neq', column, value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ op: 'is', column, value })
    return this
  }

  not(column: string, operator: string, value: unknown) {
    this.filters.push({ op: 'not', column, operator, value })
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ op: 'in', column, values })
    return this
  }

  or(value: string) {
    this.filters.push({ op: 'or', value })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderSpec = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(count: number) {
    this.limitVal = count
    return this
  }

  range(from: number, to: number) {
    this.rangeSpec = { from, to }
    return this
  }

  async then(resolve: (value: { data: any; count?: number | null; error: { message: string } | null }) => void) {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          columns: this.columns,
          count: this.countMode,
          head: this.headOnly,
          filters: this.filters,
          order: this.orderSpec,
          limit: this.limitVal,
          range: this.rangeSpec,
          payload: this.bodyPayload,
          onConflict: this.onConflictCol,
        }),
      })
      const json = await parseApiJson(res)
      if (!json) {
        resolve({
          data: null,
          count: null,
          error: { message: 'Server API unreachable (returned non-JSON). Ensure Node server.mjs is active on Hostinger.' },
        })
        return
      }
      resolve({
        data: json?.data ?? null,
        count: json?.count ?? null,
        error: json?.error ?? (!res.ok ? { message: 'Request failed' } : null),
      })
    } catch {
      resolve({ data: null, count: null, error: { message: 'Network request failed' } })
    }
  }
}

async function parseApiJson(res: Response): Promise<any | null> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (!contentType.includes('application/json')) {
    return null
  }
  try {
    return await res.json()
  } catch {
    return null
  }
}

export interface AuthUser {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

export interface AuthSession {
  user: AuthUser
}

type AuthListener = (event: string, session: AuthSession | null) => void
const authListeners = new Set<AuthListener>()

function notifyAuthListeners(event: string, session: AuthSession | null) {
  for (const listener of authListeners) {
    listener(event, session)
  }
}

/**
 * Zero-exposure client proxy: all live database, RPC, and auth calls run
 * strictly through our server-side /api/* endpoints.
 */
export const supabase = {
  auth: {
    async getSession(): Promise<{ data: { session: AuthSession | null } }> {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'same-origin' })
        if (!res.ok) return { data: { session: null } }
        const json = await res.json()
        if (json?.authenticated && json?.user) {
          return { data: { session: { user: json.user } } }
        }
      } catch {
        // ignore
      }
      return { data: { session: null } }
    },

    onAuthStateChange(callback: AuthListener) {
      authListeners.add(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback)
            },
          },
        },
      }
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok || !json?.user) {
          return { data: { session: null }, error: { message: json?.error || 'Invalid email or password.' } }
        }
        const session: AuthSession = { user: json.user }
        notifyAuthListeners('SIGNED_IN', session)
        return { data: { session }, error: null }
      } catch {
        return { data: { session: null }, error: { message: 'Authentication service unavailable.' } }
      }
    },

    async updateUser({ password }: { password: string }) {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) {
          return { error: { message: json?.error || 'Could not update password.' } }
        }
        return { error: null }
      } catch {
        return { error: { message: 'Could not update password.' } }
      }
    },

    async signOut() {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      } catch {
        // ignore
      }
      notifyAuthListeners('SIGNED_OUT', null)
    },
  },

  from(table: string): any {
    if (isOfflineMode) {
      return new MockQueryBuilder(table)
    }
    return new ServerApiQueryBuilder(table)
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
        case 'admin_reset_qr_unclaimed':
          return mockDb.resetQrUnclaimed(params)
        case 'admin_set_qr_usage_type':
          return mockDb.adminSetUsageType(params)
        case 'verify_setup_code':
          return mockDb.verifySetupCode(params)
        case 'customer_claim_qr':
          return mockDb.claimQr(params)
        case 'customer_login_qr':
          return mockDb.loginQr(params)
        case 'customer_get_dashboard':
          return mockDb.getCustomerDashboard(params)
        case 'customer_select_usage_mode':
          return mockDb.selectUsageMode(params)
        case 'customer_save_personal_profile':
          return mockDb.savePersonalProfile(params)
        case 'customer_save_business_profile':
          return mockDb.saveBusinessProfile(params)
        case 'customer_get_multi_qr_summary':
          return mockDb.getMultiQrSummary(params)
        case 'check_public_slug_available':
          return mockDb.checkPublicSlugAvailable(params)
        case 'customer_save_business_settings':
          return mockDb.saveBusinessSettings(params)
        case 'customer_change_password':
          return mockDb.customerChangePassword(params)
        case 'get_public_profile':
          return mockDb.getPublicProfile(params)
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

    try {
      const res = await fetch(`/api/rpc/${encodeURIComponent(name)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params ?? {}),
      })
      const json = await parseApiJson(res)
      if (!json) {
        return {
          data: null,
          error: { message: 'Server API unreachable (returned non-JSON). Ensure Node server.mjs is active on Hostinger.' },
        }
      }
      return {
        data: json?.data ?? null,
        error: json?.error ?? (!res.ok ? { message: 'Database RPC failed.' } : null),
      }
    } catch {
      return {
        data: null,
        error: { message: 'Database connection failed. Please check your internet connection and try again.' },
      }
    }
  },
}
