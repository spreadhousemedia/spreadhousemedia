/**
 * Local/Offline High-Performance Mock Database.
 * Powers Spread NFC completely in-memory & localStorage when Supabase credentials are in demo/offline mode.
 */

export interface MockQr {
  id: string
  qr_number: string
  qr_name: string
  destination_url: string | null
  status: 'active' | 'inactive'
  batch_id: string | null
  password: string
  scan_count: number
  created_at: string
  updated_at: string
}

export interface MockBatch {
  id: string
  batch_name: string
  series_prefix: string
  start_number: string
  end_number: string
  total_qr_codes: number
  created_at: string
  updated_at: string
}

const QR_STORAGE_KEY = 'spreadnfc_offline_qrs'
const BATCH_STORAGE_KEY = 'spreadnfc_offline_batches'

function initStorage(): { qrs: MockQr[]; batches: MockBatch[] } {
  const existingBatches = localStorage.getItem(BATCH_STORAGE_KEY)
  const existingQrs = localStorage.getItem(QR_STORAGE_KEY)

  let batches: MockBatch[] = []
  let qrs: MockQr[] = []

  if (!existingBatches) {
    batches = [
      {
        id: 'batch-1',
        batch_name: 'September Restaurant Batch',
        series_prefix: 'Z',
        start_number: '100',
        end_number: '105',
        total_qr_codes: 6,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'batch-2',
        batch_name: 'Hotel Lobby Series',
        series_prefix: 'H',
        start_number: '01',
        end_number: '10',
        total_qr_codes: 10,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
    ]
    localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batches))
  } else {
    try {
      batches = JSON.parse(existingBatches)
    } catch {
      batches = []
    }
  }

  if (!existingQrs) {
    qrs = [
      {
        id: 'qr-1',
        qr_number: 'Z100',
        qr_name: 'Rooftop Cafe Menu',
        destination_url: 'https://example.com/menu',
        status: 'active',
        batch_id: 'batch-1',
        password: 'password',
        scan_count: 142,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'qr-2',
        qr_number: 'Z101',
        qr_name: 'Bar Counter Specials',
        destination_url: 'https://example.com/bar',
        status: 'active',
        batch_id: 'batch-1',
        password: 'password',
        scan_count: 89,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'qr-3',
        qr_number: 'Z102',
        qr_name: 'Outdoor Patio Ordering',
        destination_url: 'https://example.com/patio',
        status: 'active',
        batch_id: 'batch-1',
        password: 'password',
        scan_count: 45,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: 'qr-4',
        qr_number: 'Z103',
        qr_name: 'Table 4 Reserved',
        destination_url: null,
        status: 'active',
        batch_id: 'batch-1',
        password: 'password',
        scan_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(qrs))
  } else {
    try {
      qrs = JSON.parse(existingQrs)
    } catch {
      qrs = []
    }
  }

  return { qrs, batches }
}

export const mockDb = {
  getQrs(): MockQr[] {
    return initStorage().qrs
  },

  saveQrs(qrs: MockQr[]): void {
    localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(qrs))
  },

  getBatches(): MockBatch[] {
    return initStorage().batches
  },

  saveBatches(batches: MockBatch[]): void {
    localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batches))
  },

  createSingleQr(params: {
    p_qr_number: string
    p_qr_name: string
    p_destination_url?: string | null
    p_password?: string
    p_status?: 'active' | 'inactive'
  }) {
    const qrs = this.getQrs()
    const norm = params.p_qr_number.trim().toUpperCase()

    if (qrs.some((q) => q.qr_number.toUpperCase() === norm)) {
      return { data: { ok: false, error: 'duplicate_qr_number' }, error: null }
    }

    const newQr: MockQr = {
      id: 'qr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      qr_number: norm,
      qr_name: params.p_qr_name.trim(),
      destination_url: params.p_destination_url ? params.p_destination_url.trim() : null,
      status: params.p_status ?? 'active',
      batch_id: null,
      password: params.p_password ?? '123456',
      scan_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    qrs.unshift(newQr)
    this.saveQrs(qrs)
    return { data: { ok: true, qr_number: norm }, error: null }
  },

  createBatch(params: {
    p_batch_name: string
    p_series_prefix: string
    p_start_number: string
    p_end_number: string
    p_password_mode: 'common' | 'unique'
    p_common_password?: string | null
    p_default_url?: string | null
    p_dry_run: boolean
  }) {
    const qrs = this.getQrs()
    const batches = this.getBatches()

    const start = parseInt(params.p_start_number, 10)
    const end = parseInt(params.p_end_number, 10)
    const padLen = params.p_start_number.length
    const prefix = params.p_series_prefix.trim().toUpperCase()
    const total = end - start + 1

    if (total <= 0) return { data: { ok: false, error: 'start_after_end' }, error: null }
    if (total > 5000) return { data: { ok: false, error: 'range_too_large' }, error: null }

    const first = prefix + String(start).padStart(padLen, '0')
    const last = prefix + String(end).padStart(padLen, '0')

    const conflicts: string[] = []
    const generatedNums: string[] = []

    for (let i = start; i <= end; i++) {
      const num = prefix + String(i).padStart(padLen, '0')
      generatedNums.push(num)
      if (qrs.some((q) => q.qr_number.toUpperCase() === num)) {
        conflicts.push(num)
      }
    }

    if (conflicts.length > 0) {
      return { data: { ok: false, error: 'duplicates', conflicts }, error: null }
    }

    if (params.p_dry_run) {
      return { data: { ok: true, total, first, last }, error: null }
    }

    const batchId = 'batch-' + Date.now()
    const newBatch: MockBatch = {
      id: batchId,
      batch_name: params.p_batch_name.trim(),
      series_prefix: prefix,
      start_number: params.p_start_number,
      end_number: params.p_end_number,
      total_qr_codes: total,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    batches.unshift(newBatch)
    this.saveBatches(batches)

    const passwordsList: { qr_number: string; password: string }[] = []
    const newQrs: MockQr[] = []

    for (let i = 0; i < generatedNums.length; i++) {
      const num = generatedNums[i]
      const pwd =
        params.p_password_mode === 'common'
          ? params.p_common_password || '123456'
          : Math.random().toString(36).slice(2, 8).toUpperCase()

      if (params.p_password_mode === 'unique') {
        passwordsList.push({ qr_number: num, password: pwd })
      }

      newQrs.push({
        id: 'qr-' + Date.now() + '-' + i,
        qr_number: num,
        qr_name: `${params.p_batch_name} #${start + i}`,
        destination_url: params.p_default_url || null,
        status: 'active',
        batch_id: batchId,
        password: pwd,
        scan_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    this.saveQrs([...newQrs, ...qrs])

    return {
      data: {
        ok: true,
        batch_id: batchId,
        total,
        password_mode: params.p_password_mode,
        passwords: params.p_password_mode === 'unique' ? passwordsList : null,
      },
      error: null,
    }
  },

  processCsv(params: { p_rows: Record<string, string>[]; p_dry_run: boolean }) {
    const qrs = this.getQrs()
    const errors: { row: number; qr_number?: string; error: string }[] = []
    const seenInFile = new Set<string>()
    let validCount = 0

    const toInsert: MockQr[] = []

    for (let i = 0; i < params.p_rows.length; i++) {
      const r = params.p_rows[i]
      const rowIdx = i + 1
      const num = (r.qr_number || '').trim().toUpperCase()
      const name = (r.qr_name || '').trim() || num
      const url = (r.destination_url || '').trim() || null
      const pwd = (r.password || '').trim() || '123456'

      if (!num) {
        errors.push({ row: rowIdx, error: 'missing_qr_number' })
        continue
      }
      if (seenInFile.has(num)) {
        errors.push({ row: rowIdx, qr_number: num, error: 'duplicate_in_file' })
        continue
      }
      seenInFile.add(num)

      if (qrs.some((q) => q.qr_number.toUpperCase() === num)) {
        errors.push({ row: rowIdx, qr_number: num, error: 'already_exists' })
        continue
      }

      if (pwd.length < 4) {
        errors.push({ row: rowIdx, qr_number: num, error: 'invalid_password' })
        continue
      }

      validCount++
      if (!params.p_dry_run) {
        toInsert.push({
          id: 'qr-' + Date.now() + '-' + i,
          qr_number: num,
          qr_name: name,
          destination_url: url,
          status: 'active',
          batch_id: null,
          password: pwd,
          scan_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (!params.p_dry_run && toInsert.length > 0) {
      this.saveQrs([...toInsert, ...qrs])
    }

    return {
      data: {
        ok: true,
        total: params.p_rows.length,
        valid_count: validCount,
        error_count: errors.length,
        errors,
        created: toInsert.length,
      },
      error: null,
    }
  },

  resetPassword(params: { p_qr_id: string; p_new_password: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.id === params.p_qr_id)
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    target.password = params.p_new_password
    target.updated_at = new Date().toISOString()
    this.saveQrs(qrs)
    return { data: { ok: true }, error: null }
  },

  requestQrUpdate(params: { p_qr_number: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.qr_number.toUpperCase() === params.p_qr_number.trim().toUpperCase())
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    if (target.status !== 'active') return { data: { ok: false, error: 'inactive' }, error: null }
    return { data: { ok: true }, error: null }
  },

  confirmQrUpdate(params: { p_qr_number: string; p_new_url: string; p_password: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.qr_number.toUpperCase() === params.p_qr_number.trim().toUpperCase())
    if (!target) return { data: { ok: false, error: 'not_found' }, error: null }
    if (target.status !== 'active') return { data: { ok: false, error: 'inactive' }, error: null }
    // Strict password comparison — no bypass. Compare only against this QR's own password.
    if (target.password !== params.p_password) {
      return { data: { ok: false, error: 'wrong_password' }, error: null }
    }
    target.destination_url = params.p_new_url.trim()
    target.updated_at = new Date().toISOString()
    this.saveQrs(qrs)
    return { data: { ok: true }, error: null }
  },

  getQrRedirect(params: { p_qr_number: string }) {
    const qrs = this.getQrs()
    const target = qrs.find((q) => q.qr_number.toUpperCase() === params.p_qr_number.trim().toUpperCase())
    if (!target) return { data: [], error: null }
    target.scan_count = (target.scan_count || 0) + 1
    this.saveQrs(qrs)
    return {
      data: [{ status: target.status, destination_url: target.destination_url }],
      error: null,
    }
  },
}
