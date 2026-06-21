import {
  memberRow,
  reportColumns,
  totalsRow,
  type MemberReport,
} from './member-report'

/**
 * Génère un PDF paysage du rapport d'équipe (en-tête + tableau) et déclenche le
 * téléchargement. jsPDF + autotable importés DYNAMIQUEMENT (bundle léger, SSR
 * non concerné).
 */
export async function downloadMemberReportPdf(
  report: MemberReport,
  filename: string,
  title: string,
  generatedLabel: string,
): Promise<void> {
  const { default: JsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(15)
  doc.setTextColor(17, 24, 39)
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(generatedLabel, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [reportColumns()],
    body: report.members.map(memberRow),
    foot: [totalsRow(report.totals)],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [243, 244, 246], textColor: 17, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 251] },
  })

  doc.save(filename)
}
