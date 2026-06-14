import { useQuery } from 'convex/react'
import { useNavigate } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  type LabelProps,
} from 'recharts'
import { api } from '../../../convex/_generated/api'
import { Skeleton } from '~/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'
import {
  STAGE_COLOR_VAR,
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_SHORT,
  formatCompactValue,
  formatNumber,
  type Stage,
} from './pipeline-meta'
import { FunnelTooltip } from './funnel-tooltip'

type FunnelStage = { stage: Stage; count: number; value: number }
type Funnel = {
  stages: FunnelStage[]
  totalCount: number
  totalValue: number
  activeCount: number
  activeValue: number
  wonValue: number
}

// Étapes affichées dans l'entonnoir : le flux ouvert + « gagné » (la veine).
// « perdu » est exclu du tracé (ce n'est pas une étape de progression).
const FUNNEL_STAGES = STAGE_ORDER.filter((s) => s !== 'lost')

const chartConfig = {
  count: { label: 'Opportunités' },
} satisfies ChartConfig

type Row = { stage: Stage; short: string; label: string; count: number; value: number }

/**
 * Hero du cockpit : entonnoir de conversion du pipeline en barres horizontales
 * (shadcn Chart / recharts). Couleurs d'étape depuis les tokens, accent indigo
 * réservé à l'étape « gagné » (la veine). Survol = détail de l'étape ; clic =
 * accès au pipeline. Chiffres directeurs en assay-mono. Lit `api.dashboard.funnel`.
 */
export function PipelineFunnel() {
  const funnel = useQuery(api.dashboard.funnel, {}) as Funnel | undefined
  const navigate = useNavigate()

  if (funnel === undefined) return <PipelineFunnelSkeleton />

  const { stages, totalCount, activeCount, activeValue, wonValue } = funnel
  const rows: Row[] = FUNNEL_STAGES.map((stage) => {
    const row = stages.find((s) => s.stage === stage)
    return {
      stage,
      short: STAGE_SHORT[stage],
      label: STAGE_LABEL[stage],
      count: row?.count ?? 0,
      value: row?.value ?? 0,
    }
  })

  return (
    <section
      aria-label="Entonnoir du pipeline"
      className="reveal flex flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] md:p-6"
      style={{ ['--reveal-i' as string]: 0 }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <HeroStat
            label="Pipeline actif"
            value={formatNumber(activeCount)}
            hint={`${formatNumber(totalCount)} au total`}
          />
          <HeroStat
            label="Valeur potentielle"
            value={formatCompactValue(activeValue)}
            unit="XOF"
            accent
            hint={
              wonValue > 0
                ? `${formatCompactValue(wonValue)} XOF gagnés`
                : 'Sur les étapes ouvertes'
            }
          />
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <TrendingUp className="size-4.5" />
        </span>
      </div>

      {totalCount > 0 ? (
        <ChartContainer config={chartConfig} className="aspect-auto h-[224px] w-full">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 56, bottom: 4, left: 4 }}
            barCategoryGap={8}
          >
            <YAxis
              dataKey="short"
              type="category"
              tickLine={false}
              axisLine={false}
              width={78}
              tick={{ fontSize: 12, fill: 'var(--color-fg-muted)' }}
            />
            <XAxis type="number" hide />
            <ChartTooltip cursor={false} content={<FunnelTooltip />} />
            <Bar
              dataKey="count"
              radius={4}
              maxBarSize={26}
              className="cursor-pointer"
              isAnimationActive={false}
              onClick={() => navigate({ to: '/app/pipeline' })}
            >
              {rows.map((r) => (
                <Cell key={r.stage} fill={STAGE_COLOR_VAR[r.stage]} />
              ))}
              <LabelList dataKey="count" content={<CountLabel />} />
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <div className="flex h-[224px] items-center justify-center rounded-[var(--radius)] bg-surface-2">
          <p className="text-sm text-fg-subtle">Aucune étape peuplée.</p>
        </div>
      )}
    </section>
  )
}

/** Étiquette de fin de barre : compte en assay-mono. */
function CountLabel(props: LabelProps) {
  const { x, y, width, height, value } = props
  if (typeof value !== 'number' || value === 0) return null
  const px = Number(x ?? 0) + Number(width ?? 0) + 8
  const py = Number(y ?? 0) + Number(height ?? 0) / 2
  return (
    <text
      x={px}
      y={py}
      dominantBaseline="central"
      className="assay"
      style={{ fontSize: 12, fontWeight: 600, fill: 'var(--color-fg)' }}
    >
      {formatNumber(value)}
    </text>
  )
}

function HeroStat({
  label,
  value,
  unit,
  hint,
  accent,
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={
            accent
              ? 'assay text-3xl font-semibold tracking-[-0.02em] text-accent'
              : 'assay text-3xl font-semibold tracking-[-0.02em] text-fg'
          }
        >
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-fg-muted">{unit}</span>}
      </span>
      {hint && <span className="assay-meta text-xs">{hint}</span>}
    </div>
  )
}

/** Squelette du hero entonnoir (état loading). */
export function PipelineFunnelSkeleton() {
  return (
    <section className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="size-9 rounded-[var(--radius)]" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton
              className="h-5 rounded"
              style={{ width: `${70 - i * 9}%` }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
