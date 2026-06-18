import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '~/components/ui/sheet'
import { useMediaQuery } from '~/hooks/use-media-query'
import {
  AdminKpiCards,
  AdminKpiCardsSkeleton,
  type AdminMetrics,
  type KpiKey,
} from './admin-kpi-cards'
import { PlanDistributionChart, SignupsChart } from './admin-metrics-charts'
import { AdminMetricsDrilldown } from './admin-metrics-drilldown'

/**
 * Section « Métriques » du back-office : cartes KPI cliquables (drill-down) plus
 * graphes recharts (inscriptions 30 j, répartition des paliers). Le drill-down
 * s'affiche en colonne à droite sous `lg`, en Sheet en dessous, et ne déclenche
 * aucune requête supplémentaire (dérivé de `api.admin.metrics`).
 */
export function AdminMetricsPanel() {
  const metrics = useQuery(api.admin.metrics, {}) as AdminMetrics | undefined
  const [selectedKey, setSelectedKey] = useState<KpiKey | null>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  if (metrics === undefined) return <MetricsSkeleton />

  const compact = selectedKey !== null

  return (
    <section className="flex flex-col gap-5">
      <AdminKpiCards
        metrics={metrics}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
      />

      <div className="flex gap-5">
        <div
          className={
            compact
              ? 'grid w-full min-w-0 flex-1 grid-cols-1 gap-3'
              : 'grid w-full grid-cols-1 gap-3 lg:grid-cols-2'
          }
        >
          <SignupsChart data={metrics.signupsByDay} />
          <PlanDistributionChart distribution={metrics.planDistribution} />
        </div>

        {/* Drill-down — desktop : colonne sticky à droite. */}
        {compact && selectedKey && (
          <aside className="sticky top-0 hidden h-[calc(100dvh-9rem)] w-96 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] lg:block">
            <AdminMetricsDrilldown
              key={selectedKey}
              metrics={metrics}
              kpiKey={selectedKey}
              onClose={() => setSelectedKey(null)}
            />
          </aside>
        )}
      </div>

      {/* Drill-down — sous `lg` : Sheet plein écran. */}
      <Sheet
        open={compact && !isDesktop}
        onOpenChange={(open) => !open && setSelectedKey(null)}
      >
        <SheetContent
          side="right"
          className="w-full max-w-full gap-0 p-0 [&>button:last-child]:hidden"
        >
          <SheetTitle className="sr-only">Détail de la métrique</SheetTitle>
          <SheetDescription className="sr-only">
            Lecture détaillée de la métrique sélectionnée.
          </SheetDescription>
          {selectedKey && (
            <AdminMetricsDrilldown
              key={selectedKey}
              metrics={metrics}
              kpiKey={selectedKey}
              onClose={() => setSelectedKey(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

function MetricsSkeleton() {
  return (
    <section className="flex flex-col gap-5">
      <AdminKpiCardsSkeleton />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-baseline justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-[220px] w-full rounded-[var(--radius)]" />
          </div>
        ))}
      </div>
    </section>
  )
}
