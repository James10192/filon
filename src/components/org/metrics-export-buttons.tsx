import { useState } from 'react'
import { Download, Loader2, Lock } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { useUpsell } from '~/lib/billing/use-upsell'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { UpgradeDialog } from '~/components/billing/upgrade-dialog'
import { downloadMemberReportXlsx } from '~/lib/export/to-xlsx'
import { downloadMemberReportPdf } from '~/lib/export/to-pdf'
import type { MemberReport } from '~/lib/export/member-report'

/**
 * Boutons d'export du rapport d'équipe (Excel + PDF), gatés au palier Pro+ comme
 * les autres exports (`useUpsell`). Les bibliothèques sont chargées à la volée
 * dans le handler (import dynamique) : aucun poids sur le bundle initial.
 */
export function MetricsExportButtons({
  report,
}: {
  report: MemberReport | undefined
}) {
  const { unlocks, loaded } = useUpsell()
  const canExport = unlocks('pro')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null)

  const nothing = !report || report.members.length === 0

  async function run(kind: 'xlsx' | 'pdf') {
    if (!canExport) {
      setDialogOpen(true)
      return
    }
    if (nothing || busy) return
    setBusy(kind)
    try {
      const date = new Date(report!.generatedAt)
      const stamp = date.toISOString().slice(0, 10)
      if (kind === 'xlsx') {
        await downloadMemberReportXlsx(report!, `filon-equipe-${stamp}.xlsx`)
      } else {
        await downloadMemberReportPdf(
          report!,
          `filon-equipe-${stamp}.pdf`,
          m.metrics_report_title(),
          m.metrics_report_generated({ date: date.toLocaleDateString('fr-FR') }),
        )
      }
      toast.success(m.metrics_export_success())
    } catch {
      toast.error(m.metrics_export_error())
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!loaded || (canExport && nothing) || busy !== null}
          onClick={() => run('xlsx')}
          aria-label={m.metrics_export_xlsx()}
        >
          {!canExport ? (
            <Lock className="size-4" />
          ) : busy === 'xlsx' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          <span className="hidden sm:inline">{m.metrics_export_xlsx()}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!loaded || (canExport && nothing) || busy !== null}
          onClick={() => run('pdf')}
          aria-label={m.metrics_export_pdf()}
        >
          {!canExport ? (
            <Lock className="size-4" />
          ) : busy === 'pdf' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          <span className="hidden sm:inline">{m.metrics_export_pdf()}</span>
        </Button>
      </div>
      <UpgradeDialog feature={null} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
