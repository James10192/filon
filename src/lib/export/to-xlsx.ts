import { m } from '~/lib/paraglide/messages'
import {
  memberRow,
  reportColumns,
  totalsRow,
  type MemberReport,
} from './member-report'

/**
 * Génère un vrai classeur Excel (.xlsx) du rapport d'équipe et déclenche le
 * téléchargement. SheetJS est importé DYNAMIQUEMENT (jamais au top-level) :
 * bundle initial léger et SSR non concerné.
 */
export async function downloadMemberReportXlsx(
  report: MemberReport,
  filename: string,
): Promise<void> {
  const XLSX = await import('xlsx')
  const aoa: (string | number)[][] = [
    reportColumns(),
    ...report.members.map(memberRow),
    totalsRow(report.totals),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  // Largeurs de colonnes raisonnables (membre large, métriques compactes).
  ws['!cols'] = [
    { wch: 28 },
    { wch: 14 },
    { wch: 8 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 12 },
    { wch: 18 },
    { wch: 11 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, m.metrics_sheet_summary())
  XLSX.writeFile(wb, filename)
}
