import { cn } from '~/lib/utils'
import {
  STAGE_META,
  TYPE_META,
  PRIORITY_META,
  formatDateShort,
  dueStatus,
  type Stage,
  type OppType,
  type Priority,
} from './meta'

/** Chip de stage : point coloré + libellé, fond soft. */
export function StageChip({
  stage,
  compact = false,
  className,
}: {
  stage: Stage
  compact?: boolean
  className?: string
}) {
  const meta = STAGE_META[stage]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium',
        meta.chip,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dot)} />
      {compact ? meta.short : meta.label}
    </span>
  )
}

/** Chip de type : contour + texte teinté + icône. */
export function TypeChip({
  type,
  className,
}: {
  type: OppType
  className?: string
}) {
  const meta = TYPE_META[type]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-surface px-2 text-xs font-medium',
        meta.fg,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  )
}

/** Chip de priorité, discrète. */
export function PriorityChip({
  priority,
  className,
}: {
  priority: Priority
  className?: string
}) {
  const meta = PRIORITY_META[priority]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-xs font-medium',
        meta.chip,
        className,
      )}
    >
      {meta.label}
    </span>
  )
}

/** Badge de prochaine relance : sémantique selon l'échéance. */
export function DueBadge({
  date,
  className,
}: {
  date?: string | null
  className?: string
}) {
  const status = dueStatus(date)
  if (status === 'none') return null
  const tone =
    status === 'overdue'
      ? 'bg-danger-soft text-danger'
      : status === 'today'
        ? 'bg-warning-soft text-warning'
        : 'bg-surface-2 text-fg-muted'
  const prefix =
    status === 'overdue'
      ? 'En retard · '
      : status === 'today'
        ? "Aujourd'hui"
        : ''
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium',
        tone,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status === 'today' ? prefix : prefix + formatDateShort(date)}
    </span>
  )
}
