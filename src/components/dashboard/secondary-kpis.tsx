import type { LucideIcon } from 'lucide-react'
import { Percent, Trophy, NotebookTabs, Send } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Skeleton } from '~/components/ui/skeleton'
import { formatNumber, formatPercent } from './pipeline-meta'

type Tone = 'neutral' | 'accent' | 'success'

type Summary = {
  winRate: number
  wonCount: number
  lostCount: number
  proposalsSent: number
  companiesCount: number
  contactsCount: number
  documentsCount: number
}

const TONE_ICON: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
}

/**
 * Rangee de KPI secondaires, compacts (plus petits que le hero) : taux de
 * conversion, gagnees, propositions envoyees, carnet. Lecture rapide en
 * complement de l'entonnoir, pas le centre d'attention.
 */
export function SecondaryKpis({ summary }: { summary: Summary }) {
  const items: {
    label: string
    value: string
    icon: LucideIcon
    hint: string
    tone: Tone
  }[] = [
    {
      label: 'Conversion',
      value: formatPercent(summary.winRate),
      icon: Percent,
      hint: `${formatNumber(summary.wonCount)} / ${formatNumber(summary.wonCount + summary.lostCount)} closes`,
      tone: summary.winRate >= 0.5 ? 'success' : 'neutral',
    },
    {
      label: 'Gagnées',
      value: formatNumber(summary.wonCount),
      icon: Trophy,
      hint: `${formatNumber(summary.lostCount)} perdue${summary.lostCount > 1 ? 's' : ''}`,
      tone: 'success',
    },
    {
      label: 'Propositions',
      value: formatNumber(summary.proposalsSent),
      icon: Send,
      hint: 'envoyées',
      tone: 'accent',
    },
    {
      label: 'Carnet',
      value: formatNumber(summary.companiesCount),
      icon: NotebookTabs,
      hint: `${formatNumber(summary.contactsCount)} contact${summary.contactsCount > 1 ? 's' : ''} · ${formatNumber(summary.documentsCount)} doc${summary.documentsCount > 1 ? 's' : ''}`,
      tone: 'neutral',
    },
  ]

  return (
    <section
      aria-label="Indicateurs secondaires"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {items.map((it) => (
        <CompactKpi key={it.label} {...it} />
      ))}
    </section>
  )
}

function CompactKpi({
  label,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string
  value: string
  icon: LucideIcon
  hint: string
  tone: Tone
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-card)]">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
          TONE_ICON[tone],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tabular-nums tracking-[-0.02em] text-fg">
            {value}
          </span>
          <span className="truncate text-xs font-medium uppercase tracking-[0.04em] text-fg-subtle">
            {label}
          </span>
        </span>
        <span className="truncate text-xs text-fg-muted">{hint}</span>
      </div>
    </div>
  )
}

/** Squelette de la rangee de KPI secondaires (etat loading). */
export function SecondaryKpisSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-3.5 py-3 shadow-[var(--shadow-card)]"
        >
          <Skeleton className="size-8 rounded-[var(--radius-sm)]" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </section>
  )
}
