import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { BarChart3, CircleDollarSign, Clock3, Goal } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Card } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'
import { parseCompensation } from '~/components/pipeline/pipeline-meta'

const ACTIVE_STAGES = ['lead', 'contacted', 'applied', 'interview', 'negotiation']

export function DealInsightsStrip() {
  const opportunities = useQuery(api.opportunities.list, {})

  const insights = useMemo(() => {
    if (!opportunities) return null

    const active = opportunities.filter((deal) =>
      ACTIVE_STAGES.includes(deal.stage),
    )
    const now = Date.now()
    const stageValues = ACTIVE_STAGES.map(
      (stage) => active.filter((deal) => deal.stage === stage).length,
    )
    const amounts = active
      .map((deal) => parseCompensation(deal.compensation))
      .filter((amount) => amount > 0)
      .slice(0, 8)
    const overdue = active.filter((deal) => {
      if (!deal.nextActionAt) return false
      const dueAt = new Date(deal.nextActionAt).getTime()
      return Number.isFinite(dueAt) && dueAt < now
    }).length
    const ready = active.filter((deal) => deal.stage === 'negotiation').length

    return {
      active: active.length,
      value: active.reduce(
        (sum, deal) => sum + parseCompensation(deal.compensation),
        0,
      ),
      overdue,
      ready,
      stageValues,
      amounts,
    }
  }, [opportunities])

  if (!insights) return <DealInsightsSkeleton />

  return (
    <Card className="mb-4 grid w-full grid-cols-2 gap-0 overflow-hidden p-0 shadow-none lg:grid-cols-4">
      <Insight
        icon={BarChart3}
        value={String(insights.active)}
        label="Deals actifs"
        values={insights.stageValues}
        className="border-b border-r lg:border-b-0"
      />
      <Insight
        icon={CircleDollarSign}
        value={formatCompactXof(insights.value)}
        label="Valeur potentielle"
        values={insights.amounts}
        className="border-b lg:border-b-0 lg:border-r"
      />
      <Insight
        icon={Clock3}
        value={String(insights.overdue)}
        label="Actions en retard"
        values={[insights.active - insights.overdue, insights.overdue]}
        className="border-r"
      />
      <Insight
        icon={Goal}
        value={String(insights.ready)}
        label="Prêts au closing"
        values={[insights.active, insights.ready]}
      />
    </Card>
  )
}

function Insight({
  icon: Icon,
  value,
  label,
  values,
  className,
}: {
  icon: typeof BarChart3
  value: string
  label: string
  values: number[]
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex min-h-24 items-center justify-center gap-4 px-4 py-3',
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 text-center">
        <p className="assay truncate text-lg font-semibold tabular-nums text-fg">
          {value}
        </p>
        <p className="mt-0.5 whitespace-nowrap text-xs text-fg-muted">{label}</p>
        <MicroBars values={values} />
      </div>
    </section>
  )
}

function MicroBars({ values }: { values: number[] }) {
  const normalized = values.length > 0 ? values : [0]
  const max = Math.max(...normalized, 1)

  return (
    <span
      className="mt-2 flex h-3 items-end justify-center gap-0.5"
      aria-hidden
    >
      {normalized.map((value, index) => (
        <span
          key={`${index}-${value}`}
          className="w-2 rounded-[2px] bg-accent/70"
          style={{ height: `${Math.max(18, (value / max) * 100)}%` }}
        />
      ))}
    </span>
  )
}

function DealInsightsSkeleton() {
  return (
    <Card className="mb-4 grid w-full grid-cols-2 gap-0 overflow-hidden p-0 shadow-none lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-24 items-center justify-center gap-3 border-border px-4 py-3 odd:border-r lg:border-r lg:last:border-r-0"
        >
          <Skeleton className="size-9 rounded-[var(--radius)]" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </Card>
  )
}

function formatCompactXof(value: number): string {
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value / 1_000_000)} M XOF`
  }
  if (value >= 1_000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value / 1_000)} k XOF`
  }
  return `${new Intl.NumberFormat('fr-FR').format(value)} XOF`
}
