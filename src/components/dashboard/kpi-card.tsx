import type { LucideIcon } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Skeleton } from '~/components/ui/skeleton'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONE_ICON: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export interface KpiCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  /** Détail secondaire sous la valeur (ex. « 3 en retard »). */
  hint?: string
  tone?: Tone
  className?: string
}

/** Carte KPI du tableau de bord. Chiffre en tabular-nums, icône teintée discrète. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'neutral',
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
          {label}
        </span>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)]',
            TONE_ICON[tone],
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-fg">
          {value}
        </span>
        {hint && <span className="text-sm text-fg-muted">{hint}</span>}
      </div>
    </div>
  )
}

/** Squelette de carte KPI (état loading). */
export function KpiCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-9 rounded-[var(--radius)]" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}
