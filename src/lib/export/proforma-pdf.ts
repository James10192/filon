import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../convex/_generated/api'
import { normalizeProposalKind } from '~/components/proposals/proposal-kind'
import {
  datedExportFilename,
  downloadBlob,
  formatExportAmount,
  formatExportDate,
  type ExportIssuer,
} from './export-formatters'

type LoadedProposal = FunctionReturnType<typeof api.proposals.withRecipients>

type ExportLine = {
  label: string
  description?: string
  quantity: number
  unitPrice: number
}

function documentNumber(proposal: LoadedProposal): string {
  return `FIL-${String(proposal._creationTime).slice(-6)}`
}

function recipientName(proposal: LoadedProposal): string {
  const recipients = proposal.recipients
    .map((recipient) =>
      'targetName' in recipient ? recipient.targetName : undefined,
    )
    .filter((value): value is string => Boolean(value))
  return recipients.join(', ') || proposal.company?.name || 'Client'
}

function proposalLines(proposal: LoadedProposal): ExportLine[] {
  if (proposal.lineItems && proposal.lineItems.length > 0) {
    return proposal.lineItems
  }
  return [
    {
      label: proposal.title,
      description: proposal.pitch,
      quantity: 1,
      unitPrice: proposal.amount ?? 0,
    },
  ]
}

function lineTotal(line: ExportLine): number {
  return line.quantity * line.unitPrice
}

function proposalTotal(lines: ExportLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0)
}

function drawTextBlock(
  doc: import('jspdf').jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
) {
  const lines = doc.splitTextToSize(text, width)
  doc.text(lines, x, y)
  return y + lines.length * 5
}

export async function downloadProposalPdf(
  proposal: LoadedProposal,
  issuer: ExportIssuer,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const kind = normalizeProposalKind(proposal.kind)
  const title = kind === 'proforma' ? 'Facture proforma' : 'Proposition'
  const lines = proposalLines(proposal)
  const total = proposal.amount ?? proposalTotal(lines)
  const currency = proposal.currency ?? 'XOF'
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.setFillColor(18, 24, 38)
  doc.rect(0, 0, 210, 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(title, 16, 17)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Filon', 194, 12, { align: 'right' })
  doc.text('Document commercial', 194, 18, { align: 'right' })

  doc.setTextColor(24, 28, 36)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(issuer.name, 16, 48)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let y = 54
  if (issuer.subtitle) y = drawTextBlock(doc, issuer.subtitle, 16, y, 70)
  if (issuer.email) doc.text(issuer.email, 16, y + 1)

  doc.setDrawColor(225, 228, 235)
  doc.roundedRect(122, 42, 72, 34, 2, 2)
  doc.setFont('helvetica', 'bold')
  doc.text('Client', 128, 51)
  doc.setFont('helvetica', 'normal')
  doc.text(recipientName(proposal), 128, 58, { maxWidth: 58 })

  const metaY = 88
  doc.setFontSize(9)
  doc.setTextColor(86, 92, 108)
  doc.text(`N° ${documentNumber(proposal)}`, 16, metaY)
  doc.text(`Date : ${formatExportDate(proposal.sentAt ?? proposal.createdAt)}`, 16, metaY + 6)
  if (proposal.validUntil) {
    doc.text(`Valable jusqu'au : ${formatExportDate(proposal.validUntil)}`, 16, metaY + 12)
  }

  autoTable(doc, {
    startY: 110,
    head: [['Désignation', 'Qté', 'Prix unitaire', 'Total']],
    body: lines.map((line) => [
      [line.label, line.description].filter(Boolean).join('\n'),
      String(line.quantity),
      formatExportAmount(line.unitPrice, currency),
      formatExportAmount(lineTotal(line), currency),
    ]),
    foot: [['', '', 'Total', formatExportAmount(total, currency)]],
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [18, 24, 38], textColor: [255, 255, 255] },
    footStyles: { fillColor: [246, 247, 249], textColor: [18, 24, 38], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 88 },
      1: { halign: 'right', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 36 },
      3: { halign: 'right', cellWidth: 36 },
    },
    margin: { left: 16, right: 16 },
  })

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? 150
  y = finalY + 12
  doc.setFontSize(9)
  doc.setTextColor(86, 92, 108)
  if (proposal.terms) {
    doc.setFont('helvetica', 'bold')
    doc.text('Conditions', 16, y)
    doc.setFont('helvetica', 'normal')
    y = drawTextBlock(doc, proposal.terms, 16, y + 6, 178) + 4
  }
  if (proposal.clientNote) {
    doc.setFont('helvetica', 'bold')
    doc.text('Note', 16, y)
    doc.setFont('helvetica', 'normal')
    y = drawTextBlock(doc, proposal.clientNote, 16, y + 6, 178) + 4
  }

  if (kind === 'proforma') {
    doc.setDrawColor(226, 186, 90)
    doc.setFillColor(255, 249, 235)
    doc.roundedRect(16, Math.min(y, 255), 178, 14, 2, 2, 'FD')
    doc.setTextColor(104, 76, 20)
    doc.text(
      'Document commercial provisoire, hors FNE, non comptabilisé.',
      20,
      Math.min(y + 9, 264),
    )
  }

  doc.setTextColor(140, 146, 160)
  doc.setFontSize(8)
  doc.text('Généré avec Filon', 105, 286, { align: 'center' })

  const blob = doc.output('blob')
  downloadBlob(
    datedExportFilename([kind, proposal.title], 'pdf'),
    blob,
  )
}
