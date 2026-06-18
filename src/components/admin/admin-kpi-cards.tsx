import {
  Users,
  Wallet,
  Sparkles,
  Briefcase,
  Rss,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import { Skeleton } from '~/components/ui/skeleton'
import { formatNumber, formatXof } from './admin-meta'

export type AdminMetrics = {
  totalUsers: number
  planDistribution: {
    free: number
    pro: number
    pro_ai: number
    copilot: number
  }
  signupsByDay: Array<{ day: string; count: number }>
  estimatedMrrXof: number
  aiCreditsUsedThisMonth: number
  totalOpportunities: number
  totalVeilles: number
  feedbackOpen: number
}

/** Identifiant de KPI servant de clé de drill-down. */
export type KpiKey =
  | 'users'
  | 'mrr'
  | 'ai'
  | 'opportunities'
  | 'veilles'
  | 'feedback'

type Kpi = {
  key: KpiKey
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  accent?: boolean
}

/**
 * Rangée de cartes KPI du back-office (chiffres tabulaires en assay). Chaque
 * carte est cliquable et pilote le drill-down (`onSelect`) ; la carte active est
 * mise en évidence par l'anneau d'accent.
 */
export function AdminKpiCards({
  metrics,
  selectedKey,
  onSelect,
}: {
  metrics: AdminMetrics
  selectedKey: KpiKey | null
  onSelect: (key: KpiKey | null) => void
}) {
  const kpis: Kpi[] = [
    {
      key: 'users',
      label: 'Utilisateurs',
      value: formatNumber(metrics.totalUsers),
      icon: Users,
    },
    {
      key: 'mrr',
      label: 'MRR estimé',
      value: formatXof(metrics.estimatedMrrXof),
      hint: 'Abonnements payants actifs',
      icon: Wallet,
      accent: true,
    },
    {
      key: 'ai',
      label: 'Crédits IA ce mois',
      value: formatNumber(metrics.aiCreditsUsedThisMonth),
      hint: 'Depuis le 1er du mois',
      icon: Sparkles,
    },
    {
      key: 'opportunities',
      label: 'Opportunités',
      value: formatNumber(metrics.totalOpportunities),
      icon: Briefcase,
    },
    {
      key: 'veilles',
      label: 'Veilles',
      value: formatNumber(metrics.totalVeilles),
      icon: Rss,
    },
    {
      key: 'feedback',
      label: 'Feedbacks ouverts',
      value: formatNumber(metrics.feedbackOpen),
      hint: 'Nouveaux + en cours',
      icon: Inbox,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi, i) => (
        <KpiCard
          key={kpi.key}
          kpi={kpi}
          index={i}
          selected={kpi.key === selectedKey}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function KpiCard({
  kpi,
  index,
  selected,
  onSelect,
}: {
  kpi: Kpi
  index: number
  selected: boolean
  onSelect: (key: KpiKey | null) => void
}) {
  const Icon = kpi.icon
  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? null : kpi.key)}
      data-state={selected ? 'selected' : undefined}
      className="reveal flex min-h-11 items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 text-left shadow-[var(--shadow-card)] transition-all hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] data-[state=selected]:border-[var(--color-accent-ring)] data-[state=selected]:ring-1 data-[state=selected]:ring-[var(--color-accent-ring)]"
      style={{ ['--reveal-i' as string]: index }}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="eyebrow">{kpi.label}</span>
        <span
          className={
            kpi.accent
              ? 'assay text-2xl font-semibold tracking-[-0.02em] text-accent'
              : 'assay text-2xl font-semibold tracking-[-0.02em] text-fg'
          }
        >
          {kpi.value}
        </span>
        {kpi.hint && <span className="assay-meta text-xs">{kpi.hint}</span>}
      </div>
      <span
        className={
          kpi.accent
            ? 'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent'
            : 'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-muted'
        }
      >
        <Icon className="size-4.5" />
      </span>
    </button>
  )
}

/** Squelette des cartes KPI. */
export function AdminKpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="size-9 rounded-[var(--radius)]" />
        </div>
      ))}
    </div>
  )
}
