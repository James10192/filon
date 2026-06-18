import { Inbox, Bug, Lightbulb, CircleDot, CheckCircle2 } from 'lucide-react'
import { Skeleton } from '~/components/ui/skeleton'
import { formatNumber } from './admin-meta'
import { m } from '~/lib/paraglide/messages'

export type FeedbackMetrics = {
  total: number
  byStatus: { new: number; in_progress: number; done: number }
  byType: { bug: number; idea: number; other: number }
  recent7d: number
  resolutionRate: number
}

/**
 * Encart de pilotage des feedbacks : une carte « total » (avec mini-répartition
 * par type), trois mini-widgets par statut et le taux de résolution. Une seule
 * couleur d'accent ; les statuts gardent leurs teintes sémantiques discrètes.
 */
export function AdminFeedbackMetrics({
  metrics,
}: {
  metrics: FeedbackMetrics
}) {
  const pct = Math.round(metrics.resolutionRate * 100)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <TotalCard metrics={metrics} />
      <StatusWidget
        icon={CircleDot}
        label={m.admin_fbm_new()}
        value={metrics.byStatus.new}
        tone="accent"
      />
      <StatusWidget
        icon={Inbox}
        label={m.admin_fbm_in_progress()}
        value={metrics.byStatus.in_progress}
        tone="warning"
      />
      <ResolutionWidget done={metrics.byStatus.done} pct={pct} />
    </div>
  )
}

function TotalCard({ metrics }: { metrics: FeedbackMetrics }) {
  const types: Array<{
    icon: typeof Bug
    label: string
    value: number
    cls: string
  }> = [
    { icon: Bug, label: m.admin_fbm_bugs(), value: metrics.byType.bug, cls: 'text-danger' },
    {
      icon: Lightbulb,
      label: m.admin_fbm_ideas(),
      value: metrics.byType.idea,
      cls: 'text-accent',
    },
    {
      icon: CircleDot,
      label: m.admin_fbm_others(),
      value: metrics.byType.other,
      cls: 'text-fg-muted',
    },
  ]
  return (
    <div className="reveal flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="eyebrow">{m.admin_fbm_total_label()}</span>
          <span className="assay text-2xl font-semibold tracking-[-0.02em] text-fg">
            {formatNumber(metrics.total)}
          </span>
          <span className="assay-meta text-xs">
            {metrics.recent7d > 0
              ? m.admin_fbm_recent_7d({ n: formatNumber(metrics.recent7d) })
              : m.admin_fbm_recent_7d_empty()}
          </span>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-muted">
          <Inbox className="size-4.5" />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
        {types.map((t) => {
          const Icon = t.icon
          return (
            <span
              key={t.label}
              className="inline-flex items-center gap-1.5 text-sm text-fg-muted"
            >
              <Icon className={`size-3.5 ${t.cls}`} />
              <span className="assay font-medium text-fg">
                {formatNumber(t.value)}
              </span>
              {t.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function StatusWidget({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CircleDot
  label: string
  value: number
  tone: 'accent' | 'warning'
}) {
  const badge =
    tone === 'accent'
      ? 'bg-accent-soft text-accent'
      : 'bg-warning-soft text-warning'
  return (
    <div className="reveal flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="eyebrow">{label}</span>
        <span className="assay text-2xl font-semibold tracking-[-0.02em] text-fg">
          {formatNumber(value)}
        </span>
      </div>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] ${badge}`}
      >
        <Icon className="size-4.5" />
      </span>
    </div>
  )
}

function ResolutionWidget({ done, pct }: { done: number; pct: number }) {
  return (
    <div className="reveal flex flex-col justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="eyebrow">{m.admin_fbm_done()}</span>
          <span className="assay text-2xl font-semibold tracking-[-0.02em] text-fg">
            {formatNumber(done)}
          </span>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-success-soft text-success">
          <CheckCircle2 className="size-4.5" />
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-subtle">{m.admin_fbm_resolution_rate()}</span>
          <span className="assay text-xs font-medium text-fg">{pct} %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-success"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/** Squelette de l'encart de pilotage des feedbacks. */
export function AdminFeedbackMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:col-span-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="size-9 rounded-[var(--radius)]" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </div>
          <Skeleton className="size-9 rounded-[var(--radius)]" />
        </div>
      ))}
    </div>
  )
}
