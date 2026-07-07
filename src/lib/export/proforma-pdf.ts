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
type JsPdf = import('jspdf').jsPDF
type ExportDocumentType =
  | 'proforma_hors_fne'
  | 'devis'
  | 'facture_hors_fne'
  | 'recu_paiement'

type ExportLine = {
  label: string
  description?: string
  quantity: number
  unitPrice: number
}

type PdfOptions = {
  documentNumber: string
  documentType: ExportDocumentType
}

const FALLBACK_NOTICE =
  'Document hors FNE, non certifié par la plateforme FNE, à usage commercial ou de suivi interne selon le contexte.'

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

function documentTitle(type: ExportDocumentType) {
  if (type === 'proforma_hors_fne') return 'Facture proforma hors FNE'
  if (type === 'facture_hors_fne') return 'Facture hors FNE'
  if (type === 'recu_paiement') return 'Reçu de paiement'
  return 'Devis'
}

function accentRgb(value?: string): [number, number, number] {
  const hex = value?.trim().replace('#', '')
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return [79, 70, 229]
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

function drawTextBlock(
  doc: JsPdf,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight = 4.6,
) {
  const lines = doc.splitTextToSize(text, width)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function drawLabelValue(
  doc: JsPdf,
  label: string,
  value: string,
  x: number,
  y: number,
) {
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(115, 122, 138)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(24, 28, 36)
  doc.text(value, x, y + 5)
}

async function imageToDataUrl(url: string | null | undefined) {
  if (!url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function issuerLines(issuer: ExportIssuer) {
  return [
    issuer.subtitle,
    issuer.email,
    issuer.phone,
    [issuer.address, issuer.city, issuer.country].filter(Boolean).join(', '),
    issuer.website,
    issuer.rccm ? `RCCM : ${issuer.rccm}` : undefined,
    issuer.taxId ? `NCC : ${issuer.taxId}` : undefined,
  ].filter((value): value is string => Boolean(value))
}

function paymentText(issuer: ExportIssuer) {
  return [
    issuer.paymentTerms ?? 'Paiement à réception.',
    issuer.paymentDetails,
  ]
    .filter(Boolean)
    .join('\n')
}

function drawFooter(doc: JsPdf, notice: string) {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(226, 232, 240)
    doc.line(16, 279, 194, 279)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(120, 128, 146)
    doc.text(notice, 16, 284, { maxWidth: 142 })
    doc.text(`Page ${page}/${pageCount}`, 194, 284, { align: 'right' })
  }
}

export async function downloadProposalPdf(
  proposal: LoadedProposal,
  issuer: ExportIssuer,
  options: PdfOptions,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const kind = normalizeProposalKind(proposal.kind)
  const lines = proposalLines(proposal)
  const total = proposal.amount ?? proposalTotal(lines)
  const currency = proposal.currency ?? 'XOF'
  const accent = accentRgb(issuer.accentColor)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await imageToDataUrl(issuer.logoUrl)

  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, 210, 297, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(10, 10, 190, 267, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(10, 10, 190, 267)

  doc.setFillColor(...accent)
  doc.rect(10, 10, 190, 4, 'F')

  if (logo) {
    const imageFormat = logo.includes('image/jpeg') ? 'JPEG' : 'PNG'
    doc.addImage(logo, imageFormat, 16, 22, 22, 22, undefined, 'FAST')
  } else {
    doc.setDrawColor(...accent)
    doc.setLineWidth(0.5)
    doc.roundedRect(16, 22, 22, 22, 3, 3)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...accent)
    doc.text(issuer.name.slice(0, 2).toUpperCase(), 27, 35, { align: 'center' })
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(24, 28, 36)
  doc.text(issuer.name, 43, 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  let issuerY = 34
  for (const line of issuerLines(issuer).slice(0, 5)) {
    issuerY = drawTextBlock(doc, line, 43, issuerY, 72, 4.2)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(24, 28, 36)
  doc.text(documentTitle(options.documentType), 194, 28, { align: 'right' })
  doc.setFontSize(9)
  doc.setTextColor(115, 122, 138)
  doc.text(options.documentNumber, 194, 35, { align: 'right' })
  doc.text(`Date : ${formatExportDate(proposal.sentAt ?? proposal.createdAt)}`, 194, 41, {
    align: 'right',
  })
  if (proposal.validUntil) {
    doc.text(`Échéance : ${formatExportDate(proposal.validUntil)}`, 194, 47, {
      align: 'right',
    })
  }

  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(16, 60, 82, 28, 2, 2)
  doc.roundedRect(112, 60, 82, 28, 2, 2)
  drawLabelValue(doc, 'Émetteur', issuer.name, 22, 70)
  drawLabelValue(doc, 'Client', recipientName(proposal), 118, 70)

  autoTable(doc, {
    startY: 104,
    head: [['Désignation', 'Qté', 'Prix unitaire', 'Total']],
    body: lines.map((line) => [
      [line.label, line.description].filter(Boolean).join('\n'),
      String(line.quantity),
      formatExportAmount(line.unitPrice, currency),
      formatExportAmount(lineTotal(line), currency),
    ]),
    foot: [['', '', 'Total', formatExportAmount(total, currency)]],
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: { fillColor: accent, textColor: [255, 255, 255] },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [24, 28, 36],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [252, 253, 255] },
    columnStyles: {
      0: { cellWidth: 91 },
      1: { halign: 'right', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 34 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 16, right: 16 },
  })

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? 150
  let y = finalY + 12
  if (y > 226) {
    doc.addPage()
    y = 24
  }

  const leftBlocks = [
    { title: 'Conditions', text: proposal.terms || paymentText(issuer) },
    { title: 'Moyens de paiement', text: issuer.paymentDetails },
    { title: 'Note client', text: proposal.clientNote },
  ].filter((block) => Boolean(block.text))

  for (const block of leftBlocks) {
    if (y > 246) {
      doc.addPage()
      y = 24
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(24, 28, 36)
    doc.text(block.title, 16, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.8)
    doc.setTextColor(78, 85, 102)
    y = drawTextBlock(doc, block.text ?? '', 16, y + 6, 118) + 5
  }

  if (issuer.signature) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(24, 28, 36)
    doc.text('Signature', 150, Math.max(finalY + 15, 202))
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(issuer.signature, 150, Math.max(finalY + 24, 211), {
      maxWidth: 38,
    })
  }

  const notice = issuer.legalNote || FALLBACK_NOTICE
  drawFooter(doc, notice)

  const blob = doc.output('blob')
  downloadBlob(
    datedExportFilename([kind, options.documentNumber, proposal.title], 'pdf'),
    blob,
  )
}
