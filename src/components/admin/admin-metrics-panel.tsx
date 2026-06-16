import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Skeleton } from '~/components/ui/skeleton'
import {
  AdminKpiCards,
  AdminKpiCardsSkeleton,
  type AdminMetrics,
} from './admin-kpi-cards'
import {
  PlanDistributionChart,
  SignupsChart,
} from './admin-metrics-charts'

/**
 * Section « Métriques » du back-office : cartes KPI + graphes recharts
 * (inscriptions 30 j, répartition des paliers). Lit `api.admin.metrics`.
 */
export function AdminMetricsPanel() {
  const metrics = useQuery(api.admin.metrics, {}) as AdminMetrics | undefined

  if (metrics === undefined) return <MetricsSkeleton />

  return (
    <section className="flex flex-col gap-5">
      <AdminKpiCards metrics={metrics} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SignupsChart data={metrics.signupsByDay} />
        <PlanDistributionChart distribution={metrics.planDistribution} />
      </div>
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
