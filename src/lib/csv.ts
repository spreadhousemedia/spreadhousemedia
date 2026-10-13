import Papa from 'papaparse'
import { downloadBlob } from './download'
import { qrPublicUrl } from './config'

export type CsvRawRow = Record<string, string>

export function parseCsvFile(file: File): Promise<CsvRawRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRawRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => resolve(results.data),
      error: (err: Error) => reject(err),
    })
  })
}

export async function downloadSampleCsv(): Promise<void> {
  const sample = [
    'qr_number,qr_name,destination_url,password,batch_name',
    'Z100,Cafe Menu,https://example.com/menu,123456,September Batch',
    'Z101,Shop Location,https://maps.google.com,123456,September Batch',
    'Z102,Product Catalog,https://spreadnfc.in/catalog,123456,September Batch',
    'Z103,Unassigned Standee,,123456,September Batch',
  ].join('\r\n')
  downloadBlob(sample, 'sample_qr_upload.csv', 'text/csv;charset=utf-8')
}

export async function downloadPasswordsCsv(rows: { qr_number: string; password: string }[], fileName: string): Promise<void> {
  const lines = ['qr_number,password', ...rows.map((r) => `${r.qr_number},${r.password}`)]
  downloadBlob(lines.join('\r\n'), fileName.endsWith('.csv') ? fileName : `${fileName}.csv`, 'text/csv;charset=utf-8')
}

export interface NfcEncodingRow {
  serial_number: string
  label?: string
}

/**
 * Manufacturing export: CSV mapping serial numbers directly to their pre-encoded Spread NFC dynamic redirect URL.
 * Ingested by NFC batch encoders (ACR122U, NFC Tools Desktop, RFID industrial writers) to program chips before shipping.
 */
export async function downloadNfcEncodingCsv(
  rows: NfcEncodingRow[],
  fileName: string
): Promise<void> {
  const header = 'serial_number,nfc_record_type,nfc_payload_url,label'
  const lines = [
    header,
    ...rows.map((r) => {
      const url = qrPublicUrl(r.serial_number)
      const label = (r.label || r.serial_number).replace(/"/g, '""')
      return `${r.serial_number},URI,${url},"${label}"`
    }),
  ]
  downloadBlob(lines.join('\r\n'), fileName.endsWith('.csv') ? fileName : `${fileName}.csv`, 'text/csv;charset=utf-8')
}

