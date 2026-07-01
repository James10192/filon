export type ExportIssuer = {
  name: string
  email?: string
  subtitle?: string
}

export function formatExportDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return ''
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatExportAmount(
  amount: number | undefined | null,
  currency = 'XOF',
): string {
  if (amount === null || amount === undefined) return ''
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'XOF' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency}`
  }
}

export function safeExportName(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'document'
}

export function datedExportFilename(parts: string[], ext: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `filon-${parts.map(safeExportName).join('-')}-${date}.${ext}`
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
