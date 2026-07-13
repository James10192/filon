import {
  memberRow,
  reportColumns,
  totalsRow,
  type MemberReport,
} from './member-report'

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
}

/** Ouvre un rapport imprimable. Le navigateur permet ensuite l'enregistrement PDF. */
export async function downloadMemberReportPdf(
  report: MemberReport,
  filename: string,
  title: string,
  generatedLabel: string,
): Promise<void> {
  const popup = window.open('', '_blank')
  if (!popup) return
  popup.opener = null

  const headings = reportColumns().map((column) => `<th>${escapeHtml(column)}</th>`).join('')
  const rows = report.members
    .map((member) => `<tr>${memberRow(member).map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')
  const totals = totalsRow(report.totals).map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')
  const safeFilename = filename.replace(/[^a-z0-9._-]/gi, '-')

  popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(safeFilename)}</title><style>
    @page { size: A4 landscape; margin: 12mm; } body { color:#18181b; font:12px Arial,sans-serif; } h1 { margin:0; font-size:20px; } p { color:#52525b; } table { width:100%; border-collapse:collapse; margin-top:18px; } th { background:#18181b; color:#fff; font-size:10px; text-align:left; } th,td { border-bottom:1px solid #e4e4e7; padding:8px; } td { vertical-align:top; } tfoot { background:#f4f4f5; font-weight:700; } @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
  </style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(generatedLabel)}</p><table><thead><tr>${headings}</tr></thead><tbody>${rows}</tbody><tfoot><tr>${totals}</tr></tfoot></table><script>window.onload=()=>window.print()</script></body></html>`)
  popup.document.close()
}
