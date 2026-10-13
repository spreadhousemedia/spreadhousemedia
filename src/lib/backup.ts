import { supabase, isOfflineMode } from './supabase'
import { mockDb } from './mockDb'
import { invalidateAdminQrCache } from './cache'
import { downloadBlob } from './download'
import { parseCsvFile } from './csv'
import { normalizeDestinationUrl } from './validation'

export interface BackupMetadata {
  version: string
  app: string
  exported_at: string
  stats: {
    total_qrs: number
    total_batches: number
    active_qrs: number
    inactive_qrs: number
    with_destination: number
  }
}

export interface BackupPayload {
  version: string
  app: string
  exported_at: string
  stats: {
    total_qrs: number
    total_batches: number
    active_qrs: number
    inactive_qrs: number
    with_destination: number
  }
  batches: Array<{
    id: string
    batch_name: string
    series_prefix: string
    start_number: string
    end_number: string
    total_qr_codes: number
    created_at: string
    updated_at?: string
  }>
  qr_codes: Array<{
    id: string
    qr_number: string
    qr_name: string
    destination_url: string | null
    status: string
    batch_id: string | null
    batch_name?: string | null
    password?: string
    scan_count?: number
    created_at: string
    updated_at: string
  }>
}

const BACKUP_TIME_KEY = 'spreadnfc_last_backup_time'

export function getLastBackupTime(): string | null {
  return localStorage.getItem(BACKUP_TIME_KEY)
}

export function recordBackupTime(): void {
  localStorage.setItem(BACKUP_TIME_KEY, new Date().toISOString())
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Fetch all batches and QR codes from either live Supabase or mock database.
 */
export async function fetchFullDataset(): Promise<{
  batches: BackupPayload['batches']
  qr_codes: BackupPayload['qr_codes']
}> {
  if (isOfflineMode) {
    const rawBatches = mockDb.getBatches()
    const rawQrs = mockDb.getQrs()
    const batchMap = new Map(rawBatches.map((b) => [b.id, b.batch_name]))

    const qr_codes = rawQrs.map((q) => ({
      ...q,
      batch_name: q.batch_id ? batchMap.get(q.batch_id) ?? null : null,
    }))

    return { batches: rawBatches, qr_codes }
  }

  // Live Supabase query
  const [batchesRes, qrsRes] = await Promise.all([
    supabase.from('batches').select('*').order('created_at', { ascending: false }),
    supabase
      .from('qr_codes')
      .select('id, qr_number, qr_name, destination_url, status, batch_id, scan_count, created_at, updated_at, batches(batch_name)')
      .order('qr_number', { ascending: true }),
  ])

  const batches = (batchesRes.data ?? []) as BackupPayload['batches']
  const rawQrs = (qrsRes.data ?? []) as any[]

  const qr_codes = rawQrs.map((q) => ({
    id: q.id,
    qr_number: q.qr_number,
    qr_name: q.qr_name,
    destination_url: q.destination_url,
    status: q.status,
    batch_id: q.batch_id,
    batch_name: q.batches?.batch_name ?? null,
    scan_count: q.scan_count ?? 0,
    created_at: q.created_at,
    updated_at: q.updated_at,
  }))

  return { batches, qr_codes }
}

/**
 * Export 1: Full System Backup (.JSON)
 */
export async function exportFullDatabaseJson(): Promise<{ fileName: string; sizeBytes: number }> {
  const { batches, qr_codes } = await fetchFullDataset()

  const activeCount = qr_codes.filter((q) => q.status === 'active').length
  const withDestCount = qr_codes.filter((q) => !!q.destination_url).length

  const payload: BackupPayload = {
    version: '1.0',
    app: 'Spread NFC Dynamic QR System',
    exported_at: new Date().toISOString(),
    stats: {
      total_qrs: qr_codes.length,
      total_batches: batches.length,
      active_qrs: activeCount,
      inactive_qrs: qr_codes.length - activeCount,
      with_destination: withDestCount,
    },
    batches,
    qr_codes,
  }

  const jsonStr = JSON.stringify(payload, null, 2)
  const dateStamp = new Date().toISOString().slice(0, 10)
  const fileName = `spreadnfc_full_backup_${dateStamp}.json`

  downloadBlob(jsonStr, fileName, 'application/json;charset=utf-8')
  recordBackupTime()

  return { fileName, sizeBytes: jsonStr.length }
}

/**
 * Export 2: QR Master Spreadsheet (.CSV)
 */
export async function exportQrMasterCsv(filter?: {
  batchId?: string
  status?: string
}): Promise<{ fileName: string; rowCount: number }> {
  const { qr_codes } = await fetchFullDataset()

  let rows = qr_codes
  if (filter?.batchId) rows = rows.filter((r) => r.batch_id === filter.batchId)
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status)

  const headers = [
    'QR Number',
    'QR Name',
    'Destination URL',
    'Status',
    'Scan Count',
    'Batch Name',
    'Created At',
    'Updated At',
  ]

  const csvLines = [headers.map(escapeCsvCell).join(',')]

  for (const r of rows) {
    csvLines.push(
      [
        r.qr_number,
        r.qr_name,
        r.destination_url || '',
        r.status,
        r.scan_count ?? 0,
        r.batch_name || '',
        r.created_at,
        r.updated_at,
      ]
        .map(escapeCsvCell)
        .join(','),
    )
  }

  const dateStamp = new Date().toISOString().slice(0, 10)
  const fileName = `spreadnfc_qr_codes_${dateStamp}.csv`

  downloadBlob(csvLines.join('\r\n'), fileName, 'text/csv;charset=utf-8')
  recordBackupTime()

  return { fileName, rowCount: rows.length }
}

/**
 * Export 3: Batches Overview (.CSV)
 */
export async function exportBatchesCsv(): Promise<{ fileName: string; rowCount: number }> {
  const { batches } = await fetchFullDataset()

  const headers = [
    'Batch ID',
    'Batch Name',
    'Series Prefix',
    'Start Number',
    'End Number',
    'Total QR Codes',
    'Created At',
  ]

  const csvLines = [headers.map(escapeCsvCell).join(',')]

  for (const b of batches) {
    csvLines.push(
      [
        b.id,
        b.batch_name,
        b.series_prefix,
        b.start_number,
        b.end_number,
        b.total_qr_codes,
        b.created_at,
      ]
        .map(escapeCsvCell)
        .join(','),
    )
  }

  const dateStamp = new Date().toISOString().slice(0, 10)
  const fileName = `spreadnfc_batches_${dateStamp}.csv`

  downloadBlob(csvLines.join('\r\n'), fileName, 'text/csv;charset=utf-8')
  recordBackupTime()

  return { fileName, rowCount: batches.length }
}

/**
 * Export 4: QR Passwords CSV (for Standee / Print Shop records)
 */
export async function exportPasswordsCsv(): Promise<{ fileName: string; rowCount: number }> {
  const { qr_codes } = await fetchFullDataset()

  const headers = ['QR Number', 'QR Name', 'Batch Name', 'Management Password']
  const csvLines = [headers.map(escapeCsvCell).join(',')]

  for (const r of qr_codes) {
    csvLines.push(
      [r.qr_number, r.qr_name, r.batch_name || '', r.password || '••••••']
        .map(escapeCsvCell)
        .join(','),
    )
  }

  const dateStamp = new Date().toISOString().slice(0, 10)
  const fileName = `spreadnfc_passwords_${dateStamp}.csv`

  downloadBlob(csvLines.join('\r\n'), fileName, 'text/csv;charset=utf-8')
  recordBackupTime()

  return { fileName, rowCount: qr_codes.length }
}

/**
 * Generate Migration Audit PDF Blob (Portable, printable audit ledger)
 */
export async function generateMigrationPdfBlob(data?: {
  batches: BackupPayload['batches']
  qr_codes: BackupPayload['qr_codes']
}): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf')
  const dataset = data || (await fetchFullDataset())
  const { batches, qr_codes } = dataset

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2

  let y = margin

  // Header banner
  doc.setFillColor(30, 27, 75) // Dark Indigo
  doc.rect(margin, y, contentWidth, 22, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Spread NFC DYNAMIC QR SYSTEM', margin + 6, y + 9)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(224, 231, 255)
  doc.text('OFFICIAL SYSTEM AUDIT & MIGRATION LEDGER', margin + 6, y + 16)

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  doc.setFontSize(8)
  doc.text(`Generated: ${dateStr}`, pageWidth - margin - 6, y + 12, { align: 'right' })

  y += 28

  // Section 1: Executive Overview
  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39)
  doc.text('1. EXECUTIVE SUMMARY & SYSTEM INTEGRITY', margin, y)
  y += 5

  const activeCount = qr_codes.filter((q) => q.status === 'active').length
  const withDestCount = qr_codes.filter((q) => !!q.destination_url).length
  const totalScans = qr_codes.reduce((acc, q) => acc + (q.scan_count || 0), 0)

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'FD')

  const colW = contentWidth / 4
  const metrics = [
    { label: 'TOTAL QR ALLOCATIONS', val: String(qr_codes.length) },
    { label: 'ACTIVE RECORDS', val: `${activeCount} (${qr_codes.length > 0 ? Math.round((activeCount / qr_codes.length) * 100) : 0}%)` },
    { label: 'DESTINATION CONFIGURED', val: `${withDestCount} (${qr_codes.length > 0 ? Math.round((withDestCount / qr_codes.length) * 100) : 0}%)` },
    { label: 'TOTAL SCANS LOGGED', val: String(totalScans) },
  ]

  metrics.forEach((m, idx) => {
    const x = margin + idx * colW + 4
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text(m.label, x, y + 8)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(m.val, x, y + 17)
  })

  y += 31

  // Section 2: Batches Registry Table
  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39)
  doc.text(`2. BATCHES & HARDWARE SERIES REGISTER (${batches.length} BATCHES)`, margin, y)
  y += 5

  // Table header
  doc.setFillColor(79, 70, 229) // Indigo
  doc.rect(margin, y, contentWidth, 6.5, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)

  doc.text('BATCH NAME', margin + 3, y + 4.5)
  doc.text('PREFIX', margin + 55, y + 4.5)
  doc.text('RANGE', margin + 78, y + 4.5)
  doc.text('TOTAL ALLOCATED', margin + 118, y + 4.5)
  doc.text('CREATED DATE', margin + 155, y + 4.5)
  y += 6.5

  if (batches.length === 0) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    doc.text('No batch campaigns created yet.', margin + 3, y + 5)
    y += 8
  } else {
    batches.forEach((b, i) => {
      if (y > pageHeight - 20) {
        doc.addPage()
        y = margin
      }
      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252)
      doc.rect(margin, y, contentWidth, 6, 'F')

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(15, 23, 42)

      const nameTrunc = b.batch_name.length > 28 ? b.batch_name.slice(0, 25) + '...' : b.batch_name
      doc.text(nameTrunc, margin + 3, y + 4.2)
      doc.setFont('helvetica', 'bold')
      doc.text(b.series_prefix || '—', margin + 55, y + 4.2)
      doc.setFont('helvetica', 'normal')
      doc.text(`${b.start_number} – ${b.end_number}`, margin + 78, y + 4.2)
      doc.text(`${b.total_qr_codes} standees`, margin + 118, y + 4.2)
      doc.text(b.created_at ? new Date(b.created_at).toLocaleDateString() : '—', margin + 155, y + 4.2)
      y += 6
    })
  }

  y += 7

  // Section 3: QR Inventory Table
  if (y > pageHeight - 35) {
    doc.addPage()
    y = margin
  }

  doc.setFontSize(10.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39)
  doc.text(`3. QR MASTER INVENTORY AUDIT (TOTAL: ${qr_codes.length} CODES)`, margin, y)
  y += 5

  // QR Table header
  doc.setFillColor(79, 70, 229)
  doc.rect(margin, y, contentWidth, 6.5, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)

  doc.text('QR NUMBER', margin + 3, y + 4.5)
  doc.text('LABEL NAME', margin + 35, y + 4.5)
  doc.text('DESTINATION URL', margin + 80, y + 4.5)
  doc.text('STATUS', margin + 148, y + 4.5)
  doc.text('SCANS', margin + 168, y + 4.5)
  y += 6.5

  const previewQrs = qr_codes.slice(0, 90)
  previewQrs.forEach((q, i) => {
    if (y > pageHeight - 16) {
      doc.addPage()
      y = margin

      // Repeat header on next page
      doc.setFillColor(79, 70, 229)
      doc.rect(margin, y, contentWidth, 6, 'F')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('QR NUMBER', margin + 3, y + 4.2)
      doc.text('LABEL NAME', margin + 35, y + 4.2)
      doc.text('DESTINATION URL', margin + 80, y + 4.2)
      doc.text('STATUS', margin + 148, y + 4.2)
      doc.text('SCANS', margin + 168, y + 4.2)
      y += 6
    }

    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252)
    doc.rect(margin, y, contentWidth, 5.5, 'F')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(q.qr_number, margin + 3, y + 3.9)

    doc.setFont('helvetica', 'normal')
    const nameTrunc = (q.qr_name || '—').slice(0, 22)
    doc.text(nameTrunc, margin + 35, y + 3.9)

    const urlTrunc = (q.destination_url || 'Pending initial scan').slice(0, 36)
    doc.text(urlTrunc, margin + 80, y + 3.9)

    doc.text(q.status.toUpperCase(), margin + 148, y + 3.9)
    doc.text(String(q.scan_count || 0), margin + 168, y + 3.9)
    y += 5.5
  })

  if (qr_codes.length > 90) {
    y += 3
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    doc.text(`[Showing first 90 of ${qr_codes.length} records. Full dataset preserved in spreadnfc_full_backup.json and spreadnfc_qr_codes.csv]`, margin + 3, y + 4)
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 163, 175)
    doc.text(`Spread NFC Migration & Security Ledger • Page ${p} of ${totalPages}`, margin, pageHeight - 6)
    doc.text('CONFIDENTIAL • SYSTEM AUDIT DOCUMENT', pageWidth - margin, pageHeight - 6, { align: 'right' })
  }

  return doc.output('blob')
}

/**
 * Export 5: Migration Audit Report (.PDF)
 */
export async function exportMigrationAuditPdf(): Promise<{ fileName: string; sizeBytes: number }> {
  const blob = await generateMigrationPdfBlob()
  const dateStamp = new Date().toISOString().slice(0, 10)
  const fileName = `spreadnfc_migration_audit_${dateStamp}.pdf`

  downloadBlob(blob, fileName, 'application/pdf')
  recordBackupTime()

  return { fileName, sizeBytes: blob.size }
}

/**
 * Export 6: Complete Migration Bundle (.ZIP) containing JSON, CSVs, and PDF report
 */
export async function exportFullMigrationZip(
  onProgress?: (progressText: string) => void,
): Promise<{ fileName: string; sizeBytes: number }> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const dateStamp = new Date().toISOString().slice(0, 10)

  onProgress?.('Fetching database records...')
  const dataset = await fetchFullDataset()
  const { batches, qr_codes } = dataset

  const activeCount = qr_codes.filter((q) => q.status === 'active').length
  const withDestCount = qr_codes.filter((q) => !!q.destination_url).length

  // 1. JSON
  onProgress?.('Generating full JSON snapshot...')
  const payload: BackupPayload = {
    version: '1.0',
    app: 'Spread NFC Dynamic QR System',
    exported_at: new Date().toISOString(),
    stats: {
      total_qrs: qr_codes.length,
      total_batches: batches.length,
      active_qrs: activeCount,
      inactive_qrs: qr_codes.length - activeCount,
      with_destination: withDestCount,
    },
    batches,
    qr_codes,
  }
  zip.file(`database_backup.json`, JSON.stringify(payload, null, 2))

  // 2. QR Master CSV
  onProgress?.('Generating QR Master spreadsheet...')
  const qrHeaders = ['QR Number', 'QR Name', 'Destination URL', 'Status', 'Scan Count', 'Batch Name', 'Created At', 'Updated At']
  const qrLines = [qrHeaders.map(escapeCsvCell).join(',')]
  for (const r of qr_codes) {
    qrLines.push([r.qr_number, r.qr_name, r.destination_url || '', r.status, r.scan_count ?? 0, r.batch_name || '', r.created_at, r.updated_at].map(escapeCsvCell).join(','))
  }
  zip.file(`qr_master_spreadsheet.csv`, '\uFEFF' + qrLines.join('\r\n'))

  // 3. Batches CSV
  onProgress?.('Generating Batches register...')
  const batchHeaders = ['Batch ID', 'Batch Name', 'Series Prefix', 'Start Number', 'End Number', 'Total QR Codes', 'Created At']
  const batchLines = [batchHeaders.map(escapeCsvCell).join(',')]
  for (const b of batches) {
    batchLines.push([b.id, b.batch_name, b.series_prefix, b.start_number, b.end_number, b.total_qr_codes, b.created_at].map(escapeCsvCell).join(','))
  }
  zip.file(`batches_registry.csv`, '\uFEFF' + batchLines.join('\r\n'))

  // 4. Passwords CSV
  onProgress?.('Generating Key credentials ledger...')
  const pwdHeaders = ['QR Number', 'QR Name', 'Batch Name', 'Management Password']
  const pwdLines = [pwdHeaders.map(escapeCsvCell).join(',')]
  for (const r of qr_codes) {
    pwdLines.push([r.qr_number, r.qr_name, r.batch_name || '', r.password || '••••••'].map(escapeCsvCell).join(','))
  }
  zip.file(`standee_keys_passwords.csv`, '\uFEFF' + pwdLines.join('\r\n'))

  // 5. PDF Audit Ledger
  onProgress?.('Rendering PDF Audit Report...')
  const pdfBlob = await generateMigrationPdfBlob(dataset)
  const pdfArrayBuffer = await pdfBlob.arrayBuffer()
  zip.file(`migration_audit_report.pdf`, pdfArrayBuffer)

  // 6. Readme
  const readme = `Spread NFC SYSTEM MIGRATION ARCHIVE
======================================
Export Date: ${new Date().toISOString()}
Total QR Codes: ${qr_codes.length}
Total Batches: ${batches.length}

PACKAGE CONTENTS:
1. database_backup.json      - Full system snapshot. Upload this in Spread NFC Admin -> Data Backup to restore.
2. qr_master_spreadsheet.csv - Standard RFC-4180 CSV for Excel, Google Sheets, or BI tools.
3. batches_registry.csv      - Campaign series register.
4. standee_keys_passwords.csv - Master printing and client credential keys.
5. migration_audit_report.pdf - Formal printable ledger for management or audits.

RESTORE INSTRUCTIONS:
- To restore in Spread NFC: Navigate to /admin/backup, choose "Restore Data from Backup", select database_backup.json, and choose "Merge" or "Overwrite".
`
  zip.file(`README_MIGRATION.txt`, readme)

  onProgress?.('Compressing migration archive...')
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const fileName = `spreadnfc_migration_bundle_${dateStamp}.zip`

  downloadBlob(zipBlob, fileName, 'application/zip')
  recordBackupTime()

  return { fileName, sizeBytes: zipBlob.size }
}

/**
 * Restore / Import from JSON backup file.
 */
export async function restoreFromJsonFile(
  file: File,
  mode: 'merge' | 'overwrite',
): Promise<{
  ok: boolean
  restoredBatches: number
  restoredQrs: number
  skippedQrs: number
  message: string
}> {
  const text = await file.text()
  let parsed: BackupPayload

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file format. Please upload a valid Spread NFC backup.')
  }

  if (!parsed.qr_codes || !Array.isArray(parsed.qr_codes)) {
    throw new Error('Incompatible backup format: missing qr_codes records.')
  }

  if (isOfflineMode) {
    const existingBatches = mockDb.getBatches()
    const existingQrs = mockDb.getQrs()

    if (mode === 'overwrite') {
      const newBatches = (parsed.batches || []).map((b) => ({
        id: b.id,
        batch_name: b.batch_name,
        series_prefix: b.series_prefix,
        start_number: b.start_number,
        end_number: b.end_number,
        total_qr_codes: b.total_qr_codes,
        created_at: b.created_at || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
      }))

      const newQrs = parsed.qr_codes.map((q) => ({
        id: q.id,
        qr_number: q.qr_number.toUpperCase(),
        qr_name: q.qr_name,
        destination_url: q.destination_url || null,
        status: (q.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
        batch_id: q.batch_id || null,
        password: q.password || '123456',
        scan_count: q.scan_count || 0,
        created_at: q.created_at || new Date().toISOString(),
        updated_at: q.updated_at || new Date().toISOString(),
      }))

      mockDb.saveBatches(newBatches)
      mockDb.saveQrs(newQrs)
      invalidateAdminQrCache()

      return {
        ok: true,
        restoredBatches: newBatches.length,
        restoredQrs: newQrs.length,
        skippedQrs: 0,
        message: `Successfully restored ${newQrs.length} QR codes and ${newBatches.length} batches.`,
      }
    }

    // Merge mode: Skip existing QRs by qr_number
    const existingNumSet = new Set(existingQrs.map((q) => q.qr_number.toUpperCase()))
    const toAddQrs: typeof existingQrs = []
    let skipped = 0

    for (const q of parsed.qr_codes) {
      const num = q.qr_number.toUpperCase()
      if (existingNumSet.has(num)) {
        skipped++
      } else {
        toAddQrs.push({
          id: q.id || 'qr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          qr_number: num,
          qr_name: q.qr_name,
          destination_url: q.destination_url || null,
          status: (q.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
          batch_id: q.batch_id || null,
          password: q.password || '123456',
          scan_count: q.scan_count || 0,
          created_at: q.created_at || new Date().toISOString(),
          updated_at: q.updated_at || new Date().toISOString(),
        })
      }
    }

    // Merge batches
    const existingBatchIds = new Set(existingBatches.map((b) => b.id))
    const toAddBatches: typeof existingBatches = (parsed.batches || [])
      .filter((b) => !existingBatchIds.has(b.id))
      .map((b) => ({
        id: b.id,
        batch_name: b.batch_name,
        series_prefix: b.series_prefix,
        start_number: b.start_number,
        end_number: b.end_number,
        total_qr_codes: b.total_qr_codes,
        created_at: b.created_at || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
      }))

    mockDb.saveBatches([...toAddBatches, ...existingBatches])
    mockDb.saveQrs([...toAddQrs, ...existingQrs])
    invalidateAdminQrCache()

    return {
      ok: true,
      restoredBatches: toAddBatches.length,
      restoredQrs: toAddQrs.length,
      skippedQrs: skipped,
      message: `Merged ${toAddQrs.length} new QR codes (${skipped} duplicates skipped).`,
    }
  }

  // Live Supabase restoration
  if (parsed.batches && parsed.batches.length > 0) {
    const batchesData = parsed.batches.map((b) => ({
      id: b.id,
      batch_name: b.batch_name,
      series_prefix: b.series_prefix,
      start_number: b.start_number,
      end_number: b.end_number,
      total_qr_codes: b.total_qr_codes,
      created_at: b.created_at,
    }))
    await supabase.from('batches').upsert(batchesData, { onConflict: 'id' })
  }

  const qrsData = parsed.qr_codes.map((q) => ({
    qr_number: q.qr_number.toUpperCase(),
    qr_name: q.qr_name,
    destination_url: q.destination_url || null,
    status: q.status || 'active',
    batch_id: q.batch_id || null,
    // NOTE: We intentionally do NOT restore password_hash here.
    // The backup JSON contains plain-text passwords (from the offline/mock layer),
    // but the Supabase schema stores bcrypt hashes. Sending plain text as password_hash
    // would break authentication for restored records. Admins should use
    // admin_reset_qr_password RPC if password changes are needed post-restore.
    scan_count: q.scan_count || 0,
    created_at: q.created_at || new Date().toISOString(),
    updated_at: q.updated_at || new Date().toISOString(),
  }))

  const { error } = await supabase.from('qr_codes').upsert(qrsData, { onConflict: 'qr_number' })
  if (error) throw error

  invalidateAdminQrCache()

  return {
    ok: true,
    restoredBatches: parsed.batches?.length ?? 0,
    restoredQrs: parsed.qr_codes.length,
    skippedQrs: 0,
    message: `Successfully synchronized ${parsed.qr_codes.length} records to Supabase.`,
  }
}

/**
 * Universal Restore from either .JSON or .CSV spreadsheet
 */
export async function restoreFromFile(
  file: File,
  mode: 'merge' | 'overwrite',
): Promise<{
  ok: boolean
  restoredBatches: number
  restoredQrs: number
  skippedQrs: number
  message: string
}> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.pdf')) {
    throw new Error('PDF files are printable audit documents and cannot be imported directly. Please select a .json backup or .csv spreadsheet.')
  }

  if (name.endsWith('.json')) {
    return restoreFromJsonFile(file, mode)
  }

  if (name.endsWith('.csv')) {
    const rows = await parseCsvFile(file)
    if (!rows || rows.length === 0) {
      throw new Error('The selected CSV file contains no data rows.')
    }

    // Convert CSV rows into standard QR structures
    const qr_codes = rows
      .filter((r) => r.qr_number || r['qr number'])
      .map((r, i) => {
        const num = (r.qr_number || r['qr number'] || `QR${i + 1}`).trim().toUpperCase()
        const name = (r.qr_name || r['qr name'] || `QR ${num}`).trim()
        const dest = (r.destination_url || r['destination url'] || r.url || '').trim()
        const status = (r.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active'
        const batchName = (r.batch_name || r['batch name'] || '').trim() || null
        const pwd = (r.password || r['management password'] || '123456').trim()

        return {
          id: `csv-${Date.now()}-${i}`,
          qr_number: num,
          qr_name: name,
          destination_url: dest ? normalizeDestinationUrl(dest) : null,
          status,
          batch_id: null,
          batch_name: batchName,
          password: pwd,
          scan_count: parseInt(r.scan_count || r['scan count'] || '0', 10) || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      })

    const payload: BackupPayload = {
      version: '1.0',
      app: 'Spread NFC CSV Import',
      exported_at: new Date().toISOString(),
      stats: {
        total_qrs: qr_codes.length,
        total_batches: 0,
        active_qrs: qr_codes.filter((q) => q.status === 'active').length,
        inactive_qrs: qr_codes.filter((q) => q.status === 'inactive').length,
        with_destination: qr_codes.filter((q) => !!q.destination_url).length,
      },
      batches: [],
      qr_codes,
    }

    const fakeJsonFile = new File([JSON.stringify(payload)], 'converted_from_csv.json', { type: 'application/json' })
    return restoreFromJsonFile(fakeJsonFile, mode)
  }

  throw new Error('Unsupported file format. Please upload a .json backup or .csv spreadsheet.')
}
