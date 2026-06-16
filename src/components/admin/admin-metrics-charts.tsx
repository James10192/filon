import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '~/components/ui/chart'
import { planLabel } from './admin-meta'
import type { AdminMetrics } from './admin-kpi-cards'

const signupsConfig = {
  count: { label: 'Inscriptions', color: 'var(--color-accent)' },
} satisfies ChartConfig

const plansConfig = {
  count: { label: 'Comptes' },
} satisfies ChartConfig

/** Étiquette d'axe X : « 14/06 » à partir d'un 'YYYY-MM-DD'. */
function dayTick(day: string): string {
  const [, m, d] = day.split('-')
  return `${d}/${m}`
}

/**
 * Graphe des inscriptions sur 30 jours (aire, accent indigo). Une seule couleur
 * d'accent, grille discrète, axes sobres.
 */
export function SignupsChart({
  data,
}: {
  data: AdminMetrics['signupsByDay']
}) {
  const total = data.reduce((s, p) => s + p.count, 0)
  return (
    <ChartPanel
      title="Inscriptions (30 jours)"
      hint={total > 0 ? `${total} au total` : 'Aucune sur la période'}
    >
      <ChartContainer config={signupsConfig} className="aspect-auto h-[220px] w-full">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="adminSignups" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="day"
            tickFormatter={dayTick}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tick={{ fontSize: 11, fill: 'var(--color-fg-muted)' }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={32}
            tick={{ fontSize: 11, fill: 'var(--color-fg-muted)' }}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => dayTick(String(value))}
              />
            }
          />
          <Area
            dataKey="count"
            type="monotone"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="url(#adminSignups)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </ChartPanel>
  )
}

/**
 * Répartition des paliers en barres verticales. Palier payant en accent indigo,
 * gratuit en neutre, pour souligner la conversion sans multiplier les couleurs.
 */
export function PlanDistributionChart({
  distribution,
}: {
  distribution: AdminMetrics['planDistribution']
}) {
  const rows = [
    { key: 'free', label: planLabel('free'), count: distribution.free, paid: false },
    { key: 'pro', label: planLabel('pro'), count: distribution.pro, paid: true },
    { key: 'pro_ai', label: planLabel('pro_ai'), count: distribution.pro_ai, paid: true },
    { key: 'copilot', label: planLabel('copilot'), count: distribution.copilot, paid: true },
  ]
  const paidTotal = rows.filter((r) => r.paid).reduce((s, r) => s + r.count, 0)

  return (
    <ChartPanel
      title="Répartition des paliers"
      hint={paidTotal > 0 ? `${paidTotal} payant${paidTotal > 1 ? 's' : ''}` : 'Aucun payant'}
    >
      <ChartContainer config={plansConfig} className="aspect-auto h-[220px] w-full">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-fg-muted)' }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={32}
            tick={{ fontSize: 11, fill: 'var(--color-fg-muted)' }}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={4} maxBarSize={56} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell
                key={r.key}
                fill={r.paid ? 'var(--color-accent)' : 'var(--color-border-strong)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartPanel>
  )
}

function ChartPanel({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-fg">
          {title}
        </h3>
        {hint && <span className="assay-meta text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
