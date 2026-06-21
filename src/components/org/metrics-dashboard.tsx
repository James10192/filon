import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Skeleton } from '~/components/ui/skeleton'
import { MetricsExportButtons } from './metrics-export-buttons'
import {
  memberRow,
  pct,
  reportColumns,
  totalsRow,
} from '~/lib/export/member-report'

/**
 * Tableau de bord des métriques d'équipe (manager). KPI de synthèse + tableau
 * par membre + export Excel/PDF. Mêmes colonnes que l'export (source unique
 * `member-report`).
 */
export function MetricsDashboard({
  organizationId,
}: {
  organizationId: Id<'organizations'>
}) {
  const report = useQuery(api.team.metrics, { organizationId })

  if (report === undefined) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-[var(--radius-lg)]" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
      </div>
    )
  }

  const columns = reportColumns()
  const empty = report.members.length === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-fg">{m.metrics_title()}</h3>
          <p className="mt-1 text-sm text-fg-muted">{m.metrics_description()}</p>
        </div>
        <MetricsExportButtons report={report} />
      </div>

      {empty ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-fg-muted">
          {m.metrics_empty()}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label={m.metrics_kpi_members()} value={report.members.length} />
            <Kpi label={m.metrics_kpi_active()} value={report.totals.active} />
            <Kpi label={m.metrics_kpi_won()} value={report.totals.won} />
            <Kpi
              label={m.metrics_kpi_conversion()}
              value={pct(report.totals.conversion)}
            />
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((c, i) => (
                    <TableHead
                      key={c}
                      className={i === 0 ? 'px-3' : 'px-3 text-right'}
                    >
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.members.map((member) => {
                  const cells = memberRow(member)
                  return (
                    <TableRow key={member.userId} className="hover:bg-surface-2">
                      {cells.map((cell, i) => (
                        <TableCell
                          key={i}
                          className={
                            i === 0
                              ? 'px-3 py-2.5 font-medium text-fg'
                              : 'assay px-3 py-2.5 text-right text-fg-muted'
                          }
                        >
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  {totalsRow(report.totals).map((cell, i) => (
                    <TableCell
                      key={i}
                      className={
                        i === 0
                          ? 'px-3 py-2.5 font-semibold text-fg'
                          : 'assay px-3 py-2.5 text-right font-semibold text-fg'
                      }
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p className="mt-1 assay text-2xl font-semibold text-fg">{value}</p>
    </div>
  )
}
