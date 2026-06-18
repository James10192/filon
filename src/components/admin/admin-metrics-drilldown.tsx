import {
  Bot,
  Briefcase,
  Inbox,
  Rss,
  Sparkles,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatNumber, formatXof, planLabel } from './admin-meta'
import type { AdminMetrics } from './admin-kpi-cards'
import type { KpiKey } from './admin-kpi-cards'
import { m } from '~/lib/paraglide/messages'

const DRILL_ICON: Record<KpiKey, LucideIcon> = {
  users: Users,
  mrr: Wallet,
  ai: Sparkles,
  opportunities: Briefcase,
  veilles: Rss,
  feedback: Inbox,
}

function drillTitle(key: KpiKey): string {
  switch (key) {
    case 'users':
      return m.admin_drill_users()
    case 'mrr':
      return m.admin_drill_mrr()
    case 'ai':
      return m.admin_drill_ai()
    case 'opportunities':
      return m.admin_drill_opportunities()
    case 'veilles':
      return m.admin_drill_veilles()
    case 'feedback':
      return m.admin_drill_feedback()
  }
}

/**
 * Panneau de drill-down d'un KPI (master-detail des Métriques). N'émet aucune
 * requête supplémentaire : dérive tout de `AdminMetrics` déjà chargé. Chaque clé
 * a sa lecture dédiée (répartition, taux de conversion, insight IA, etc.).
 */
export function AdminMetricsDrilldown({
  metrics,
  kpiKey,
  onClose,
}: {
  metrics: AdminMetrics
  kpiKey: KpiKey
  onClose: () => void
}) {
  const Icon = DRILL_ICON[kpiKey]
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-muted">
            <Icon className="size-5" />
          </span>
          <span className="truncate font-semibold text-fg">{drillTitle(kpiKey)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={m.admin_close_detail()}
          className="h-11 w-11 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
        {(kpiKey === 'users' || kpiKey === 'mrr') && (
          <PlansBreakdown metrics={metrics} />
        )}
        {kpiKey === 'ai' && <AiInsight metrics={metrics} />}
        {kpiKey === 'opportunities' && (
          <SingleStat
            label={m.admin_drill_opp_label()}
            value={formatNumber(metrics.totalOpportunities)}
            hint={m.admin_drill_opp_hint()}
          />
        )}
        {kpiKey === 'veilles' && (
          <SingleStat
            label={m.admin_drill_veilles_label()}
            value={formatNumber(metrics.totalVeilles)}
            hint={m.admin_drill_veilles_hint()}
          />
        )}
        {kpiKey === 'feedback' && <FeedbackInsight metrics={metrics} />}
      </div>
    </div>
  )
}

function PlansBreakdown({ metrics }: { metrics: AdminMetrics }) {
  const d = metrics.planDistribution
  const rows: Array<{ key: string; label: string; count: number; paid: boolean }> =
    [
      { key: 'free', label: planLabel('free'), count: d.free, paid: false },
      { key: 'pro', label: planLabel('pro'), count: d.pro, paid: true },
      { key: 'pro_ai', label: planLabel('pro_ai'), count: d.pro_ai, paid: true },
      {
        key: 'copilot',
        label: planLabel('copilot'),
        count: d.copilot,
        paid: true,
      },
    ]
  const max = Math.max(1, ...rows.map((r) => r.count))
  const paid = rows.filter((r) => r.paid).reduce((s, r) => s + r.count, 0)
  const conversion =
    metrics.totalUsers > 0
      ? Math.round((paid / metrics.totalUsers) * 100)
      : 0
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatChip label={m.admin_kpi_mrr_label()} value={formatXof(metrics.estimatedMrrXof)} accent />
        <StatChip
          label={m.admin_drill_conversion()}
          value={`${conversion} %`}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{m.admin_chart_plans_title()}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-fg-subtle">
                {r.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={
                    r.paid
                      ? 'h-full rounded-full bg-accent'
                      : 'h-full rounded-full bg-[var(--color-border-strong)]'
                  }
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="assay w-8 shrink-0 text-right text-xs text-fg-muted">
                {formatNumber(r.count)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}

function AiInsight({ metrics }: { metrics: AdminMetrics }) {
  return (
    <>
      <SingleStat
        label={m.admin_drill_ai_label()}
        value={formatNumber(metrics.aiCreditsUsedThisMonth)}
        hint={m.admin_drill_ai_hint()}
      />
      <Card className="border-accent/30 bg-accent-soft/40">
        <CardContent className="flex items-start gap-3 py-4">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
            <Bot className="size-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-fg">{m.admin_drill_ai_insight_title()}</p>
            <p className="text-sm leading-relaxed text-fg-muted">
              {m.admin_drill_ai_insight_body()}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function FeedbackInsight({ metrics }: { metrics: AdminMetrics }) {
  return (
    <SingleStat
      label={m.admin_drill_feedback_label()}
      value={formatNumber(metrics.feedbackOpen)}
      hint={m.admin_drill_feedback_hint()}
    />
  )
}

function SingleStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-5">
        <span className="eyebrow">{label}</span>
        <span className="assay text-3xl font-semibold tracking-[-0.02em] text-fg">
          {value}
        </span>
        <p className="text-sm leading-relaxed text-fg-muted">{hint}</p>
      </CardContent>
    </Card>
  )
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2.5">
      <span className="text-xs text-fg-subtle">{label}</span>
      <span
        className={
          accent
            ? 'assay text-sm font-semibold text-accent'
            : 'assay text-sm font-semibold text-fg'
        }
      >
        {value}
      </span>
    </div>
  )
}
