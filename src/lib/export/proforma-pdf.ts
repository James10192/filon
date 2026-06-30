import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../convex/_generated/api'
import {
  formatAmount,
  formatDate,
} from '~/components/proposals/proposal-status'
import {
  normalizeProposalKind,
  proposalKindLabel,
} from '~/components/proposals/proposal-kind'

type LoadedProposal = FunctionReturnType<typeof api.proposals.withRecipients>

function recipientName(proposal: LoadedProposal): string {
  if (proposal.recipients.length > 0) {
    return proposal.recipients
      .map((recipient) =>
        'targetName' in recipient ? recipient.targetName : undefined,
      )
      .filter((value): value is string => Boolean(value))
      .join(', ')
  }
  return proposal.company?.name ?? 'Client'
}

export async function downloadProposalPdf(
  proposal: LoadedProposal,
): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const kind = normalizeProposalKind(proposal.kind)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const marginX = 18
  let y = 20

  const title =
    kind === 'proforma' ? 'Facture proforma' : proposalKindLabel(kind)
  const amount = formatAmount(proposal.amount, proposal.currency) ?? 'À définir'
  const sentAt =
    formatDate(proposal.sentAt) ?? formatDate(new Date().toISOString()) ?? ''
  const target = recipientName(proposal)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(title, marginX, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (kind === 'proforma') {
    doc.text(
      'Document commercial provisoire, hors FNE, non comptabilisé.',
      marginX,
      y,
    )
    y += 6
  }
  doc.text(`Date : ${sentAt}`, marginX, y)
  y += 6
  doc.text(`Destinataire : ${target}`, marginX, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(proposal.title, marginX, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const bodyLines = doc.splitTextToSize(proposal.pitch, 174)
  doc.text(bodyLines, marginX, y)
  y += bodyLines.length * 5 + 8

  doc.setDrawColor(220, 224, 230)
  doc.line(marginX, y, 192, y)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.text('Montant estimatif', marginX, y)
  doc.text(amount, 192, y, { align: 'right' })
  y += 10

  if (kind === 'proforma') {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const noteLines = doc.splitTextToSize(
      'Cette proforma est fournie à titre commercial. Elle ne remplace pas une facture définitive et peut être ajustée avant émission finale.',
      174,
    )
    doc.text(noteLines, marginX, y)
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const safeTitle = proposal.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `filon-${kind}-${safeTitle || 'document'}-${stamp}.pdf`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
