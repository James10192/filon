import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../convex/_generated/api'
import { buildCsv, downloadCsv } from './to-csv'
import {
  datedExportFilename,
  formatExportAmount,
  formatExportDate,
} from './export-formatters'

type LoadedProposal = FunctionReturnType<typeof api.proposals.withRecipients>

type Line = {
  label: string
  description?: string
  quantity: number
  unitPrice: number
}

function linesFor(proposal: LoadedProposal): Line[] {
  if (proposal.lineItems && proposal.lineItems.length > 0) return proposal.lineItems
  return [
    {
      label: proposal.title,
      description: proposal.pitch,
      quantity: 1,
      unitPrice: proposal.amount ?? 0,
    },
  ]
}

function lineTotal(line: Line): number {
  return line.quantity * line.unitPrice
}

function recipientNames(proposal: LoadedProposal): string {
  const names = proposal.recipients
    .map((recipient) =>
      'targetName' in recipient ? recipient.targetName : undefined,
    )
    .filter((value): value is string => Boolean(value))
  return names.join(', ') || proposal.company?.name || ''
}

export async function downloadProposalXlsx(
  proposal: LoadedProposal,
): Promise<void> {
  const XLSX = await import('xlsx')
  const currency = proposal.currency ?? 'XOF'
  const lines = linesFor(proposal)
  const total = proposal.amount ?? lines.reduce((sum, line) => sum + lineTotal(line), 0)
  const rows: (string | number)[][] = [
    ['Document', proposal.kind === 'proforma' ? 'Proforma' : 'Proposition'],
    ['Titre', proposal.title],
    ['Client', recipientNames(proposal)],
    ['Date', formatExportDate(proposal.sentAt ?? proposal.createdAt)],
    ['Validité', formatExportDate(proposal.validUntil)],
    [],
    ['Désignation', 'Description', 'Quantité', 'Prix unitaire', 'Total'],
    ...lines.map((line) => [
      line.label,
      line.description ?? '',
      line.quantity,
      line.unitPrice,
      lineTotal(line),
    ]),
    ['', '', '', 'Total', total],
    [],
    ['Conditions', proposal.terms ?? ''],
    ['Note client', proposal.clientNote ?? ''],
    ['Mention', 'Document commercial provisoire, hors FNE, non comptabilisé.'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 28 },
    { wch: 42 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
  ]
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:E1')
  for (let row = 7; row <= range.e.r + 1; row += 1) {
    for (const col of [3, 4]) {
      const cell = ws[XLSX.utils.encode_cell({ r: row - 1, c: col })]
      if (cell && typeof cell.v === 'number') cell.z = currency === 'XOF' ? '#,##0' : '#,##0.00'
    }
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Document')
  XLSX.writeFile(wb, datedExportFilename([proposal.kind ?? 'proposal', proposal.title], 'xlsx'))
}

export function downloadProposalCsv(proposal: LoadedProposal): void {
  const currency = proposal.currency ?? 'XOF'
  const rows = linesFor(proposal).map((line) => ({
    label: line.label,
    description: line.description ?? '',
    quantity: line.quantity,
    unitPrice: formatExportAmount(line.unitPrice, currency),
    total: formatExportAmount(lineTotal(line), currency),
  }))
  const csv = buildCsv(rows, [
    { header: 'Désignation', value: (row) => row.label },
    { header: 'Description', value: (row) => row.description },
    { header: 'Quantité', value: (row) => row.quantity },
    { header: 'Prix unitaire', value: (row) => row.unitPrice },
    { header: 'Total', value: (row) => row.total },
  ])
  downloadCsv(
    datedExportFilename([proposal.kind ?? 'proposal', proposal.title], 'csv'),
    csv,
  )
}
