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

type Kpi = {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  accent?: boolean
}

/** Rangée de cartes KPI du back-office (chiffres tabulaires en assay). */
export function AdminKpiCards({ metrics }: { metrics: AdminMetrics }) {
  const kpis: Kpi[] = [
    {
      label: 'Utilisateurs',
      value: formatNumber(metrics.totalUsers),
      icon: Users,
    },
    {
      label: 'MRR estimé',
      value: formatXof(metrics.estimatedMrrXof),
      hint: 'Abonnements payants actifs',
      icon: Wallet,
      accent: true,
    },
    {
      label: 'Crédits IA ce mois',
      value: formatNumber(metrics.aiCreditsUsedThisMonth),
      hint: 'Depuis le 1er du mois',
      icon: Sparkles,
    },
    {
      label: 'Opportunités',
      value: formatNumber(metrics.totalOpportunities),
      icon: Briefcase,
    },
    {
      label: 'Veilles',
      value: formatNumber(metrics.totalVeilles),
      icon: Rss,
    },
    {
      label: 'Feedbacks ouverts',
      value: formatNumber(metrics.feedbackOpen),
      hint: 'Nouveaux + en cours',
      icon: Inbox,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.label} kpi={kpi} index={i} />
      ))}
    </div>
  )
}

function KpiCard({ kpi, index }: { kpi: Kpi; index: number }) {
  const Icon = kpi.icon
  return (
    <div
      className="reveal flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
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
    </div>
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
