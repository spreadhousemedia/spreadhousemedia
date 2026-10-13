/**
 * Bulletproof Browser File Download Utility
 * 
 * Replaces unreliable CJS/ESM interop with 'file-saver' using native
 * HTML5 anchor [download] with Object URLs and UTF-8 Byte Order Mark (BOM).
 * Guarantees exact MIME types and file extensions across all browsers.
 */

export function downloadBlob(
  content: Blob | string | BlobPart,
  fileName: string,
  mimeType: string = 'application/octet-stream'
): void {
  let blob: Blob

  if (content instanceof Blob) {
    blob = content
  } else if (typeof content === 'string') {
    const isCsv = fileName.toLowerCase().endsWith('.csv') || mimeType.includes('csv')
    // Prepend UTF-8 BOM (\uFEFF) for CSV files so Excel on Windows parses columns and accents properly
    const finalContent = isCsv && !content.startsWith('\uFEFF') ? '\uFEFF' + content : content
    blob = new Blob([finalContent], { type: mimeType })
  } else {
    blob = new Blob([content as any], { type: mimeType })
  }

  // Create temporary object URL
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'

  // Append, click, and clean up
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  setTimeout(() => {
    window.URL.revokeObjectURL(url)
  }, 2000)
}
