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

type DrillMeta = {
  title: string
  icon: LucideIcon
}

const META: Record<KpiKey, DrillMeta> = {
  users: { title: 'Utilisateurs', icon: Users },
  mrr: { title: 'Revenu récurrent', icon: Wallet },
  ai: { title: 'Crédits IA', icon: Sparkles },
  opportunities: { title: 'Opportunités', icon: Briefcase },
  veilles: { title: 'Veilles', icon: Rss },
  feedback: { title: 'Feedbacks ouverts', icon: Inbox },
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
  const meta = META[kpiKey]
  const Icon = meta.icon
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-muted">
            <Icon className="size-5" />
          </span>
          <span className="truncate font-semibold text-fg">{meta.title}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fermer le détail"
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
            label="Total des opportunités"
            value={formatNumber(metrics.totalOpportunities)}
            hint="Cumul cross-tenant, tous stades confondus."
          />
        )}
        {kpiKey === 'veilles' && (
          <SingleStat
            label="Veilles configurées"
            value={formatNumber(metrics.totalVeilles)}
            hint="Recherches sauvegardées par les utilisateurs."
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
        <StatChip label="MRR estimé" value={formatXof(metrics.estimatedMrrXof)} accent />
        <StatChip
          label="Conversion payante"
          value={`${conversion} %`}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Répartition des paliers</CardTitle>
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
        label="Crédits IA consommés ce mois"
        value={formatNumber(metrics.aiCreditsUsedThisMonth)}
        hint="Cumul depuis le 1er du mois courant."
      />
      <Card className="border-accent/30 bg-accent-soft/40">
        <CardContent className="flex items-start gap-3 py-4">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
            <Bot className="size-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-fg">Lecture Copilote</p>
            <p className="text-sm leading-relaxed text-fg-muted">
              La consommation IA reflète l'adoption des paliers Pro+ IA et
              Copilote. Une hausse soutenue est un signal d'expansion à suivre
              de près pour le calibrage des packs de crédits.
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
      label="Feedbacks ouverts"
      value={formatNumber(metrics.feedbackOpen)}
      hint="Retours au statut Nouveau ou En cours. Le détail par retour est dans l'onglet Feedbacks."
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
