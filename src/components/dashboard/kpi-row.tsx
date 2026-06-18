import { useQuery } from 'convex/react'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  Send,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { Area, AreaChart } from 'recharts'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Skeleton } from '~/components/ui/skeleton'
import { ChartContainer, type ChartConfig } from '~/components/ui/chart'
import { formatNumber, formatPercent } from './pipeline-meta'
import {
  formatDelta,
  sumSeries,
  toSparkPoints,
  trendDelta,
  type Trend,
} from './dashboard-charts'

type Summary = {
  winRate: number
  wonCount: number
  lostCount: number
  proposalsSent: number
  activeCount: number
}

type Tone = 'accent' | 'success' | 'neutral'

const sparkConfig = {
  v: { label: 'Volume', color: 'var(--color-chart-1)' },
} satisfies ChartConfig

/**
 * Rangée de 4 cartes KPI du cockpit. Chaque carte : grande valeur en assay-mono,
 * mini-sparkline recharts (8 semaines) et delta de tendance. Discipline
 * monochrome + indigo : la couleur ne sert qu'à porter le sens (gagné = veine
 * « won »), jamais de remplissage décoratif. Lit `api.dashboard.trends`.
 */
export function KpiRow({ summary }: { summary: Summary }) {
  const trend = useQuery(api.dashboard.trends, {}) as Trend | undefined
  if (trend === undefined) return <KpiRowSkeleton />

  const items: KpiCardProps[] = [
    {
      label: m.dash_kpi_active_pipeline(),
      value: formatNumber(summary.activeCount),
      icon: Briefcase,
      series: trend.opportunities,
      tone: 'neutral',
      hint: m.dash_kpi_active_pipeline_hint({ n: formatNumber(sumSeries(trend.opportunities)) }),
    },
    {
      label: m.dash_kpi_won(),
      value: formatNumber(summary.wonCount),
      icon: Trophy,
      series: trend.won,
      tone: 'success',
      hint:
        summary.lostCount > 1
          ? m.dash_kpi_lost_plural({ n: formatNumber(summary.lostCount) })
          : m.dash_kpi_lost_singular({ n: formatNumber(summary.lostCount) }),
    },
    {
      label: m.dash_kpi_proposals(),
      value: formatNumber(summary.proposalsSent),
      icon: Send,
      series: trend.proposals,
      tone: 'accent',
      hint: m.dash_kpi_proposals_hint(),
    },
    {
      label: m.dash_kpi_conversion(),
      value: formatPercent(summary.winRate),
      icon: TrendingUp,
      series: trend.won,
      tone: summary.winRate >= 0.5 ? 'success' : 'neutral',
      hint: m.dash_kpi_conversion_hint({
        won: formatNumber(summary.wonCount),
        total: formatNumber(summary.wonCount + summary.lostCount),
      }),
    },
  ]

  return (
    <section
      aria-label={m.dash_kpi_section_label()}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {items.map((it, idx) => (
        <KpiCard key={it.label} {...it} index={idx} />
      ))}
    </section>
  )
}

type KpiCardProps = {
  label: string
  value: string
  icon: LucideIcon
  series: number[]
  tone: Tone
  hint: string
}

const STROKE: Record<Tone, string> = {
  accent: 'var(--color-accent)',
  success: 'var(--color-stage-won)',
  neutral: 'var(--color-fg-subtle)',
}

function KpiCard({
  label,
  value,
  icon: Icon,
  series,
  tone,
  hint,
  index,
}: KpiCardProps & { index: number }) {
  const delta = trendDelta(series)
  const points = toSparkPoints(series)
  const stroke = STROKE[tone]
  const fillId = `kpi-fill-${label.replace(/\s+/g, '')}`

  return (
    <div
      className="reveal flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
      style={{ ['--reveal-i' as string]: index + 1 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow truncate">{label}</span>
        <Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden />
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="assay text-3xl font-semibold leading-none tracking-[-0.02em] text-fg">
          {value}
        </span>
        <DeltaChip delta={delta} />
      </div>

      <ChartContainer
        config={sparkConfig}
        className="aspect-auto h-9 w-full"
        aria-hidden
      >
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="v"
            type="monotone"
            stroke={stroke}
            strokeWidth={1.5}
            fill={`url(#${fillId})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>

      <span className="assay-meta truncate text-xs">{hint}</span>
    </div>
  )
}

function DeltaChip({ delta }: { delta: number | null }) {
  const up = delta !== null && delta > 0.001
  const down = delta !== null && delta < -0.001
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
        up && 'bg-success-soft text-success',
        down && 'bg-danger-soft text-danger',
        !up && !down && 'bg-surface-2 text-fg-subtle',
      )}
    >
      <Icon className="size-3" aria-hidden />
      <span className="assay">{formatDelta(delta)}</span>
    </span>
  )
}

/** Squelette de la rangée KPI (état loading). */
export function KpiRowSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-4 rounded" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-9 w-full rounded" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </section>
  )
}
