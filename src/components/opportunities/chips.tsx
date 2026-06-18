import { Building2, User } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import {
  STAGE_META,
  TYPE_META,
  PRIORITY_META,
  SOURCE_META,
  formatDateShort,
  dueStatus,
  type Stage,
  type OppType,
  type Priority,
  type SourceChannel,
  type TargetType,
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

/**
 * Chip de cible : icône (entreprise / particulier) + nom. Discrète, fond soft.
 * Ne s'affiche que si une cible nommée existe (sinon renvoie null).
 */
export function TargetChip({
  targetType,
  name,
  className,
}: {
  targetType: TargetType
  name?: string
  className?: string
}) {
  if (targetType === 'none' || !name) return null
  const Icon = targetType === 'company' ? Building2 : User
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md bg-surface-2 px-2 text-xs font-medium text-fg-muted',
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-fg-subtle" />
      <span className="max-w-[12rem] truncate">{name}</span>
    </span>
  )
}

/** Libellé FR de la source : « canal · précision ». Vide si rien de pertinent. */
export function sourceLabel(
  sourceChannel?: SourceChannel | null,
  sourceDetail?: string | null,
  fallback?: string | null,
): string {
  const channel = sourceChannel ? SOURCE_META[sourceChannel].label : ''
  const detail = sourceDetail?.trim() ?? ''
  if (channel && detail) return `${channel} · ${detail}`
  if (channel) return channel
  if (detail) return detail
  return fallback?.trim() ?? ''
}

/**
 * Étiquettes (tags) en chips compactes, avec troncature au-delà de `max`.
 * Renvoie null si aucune étiquette.
 */
export function TagChips({
  tags,
  max = 3,
  className,
}: {
  tags: string[]
  max?: number
  className?: string
}) {
  if (tags.length === 0) return null
  const shown = tags.slice(0, max)
  const rest = tags.length - shown.length
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {shown.map((tag) => (
        <span
          key={tag}
          className="inline-flex h-5 items-center rounded-[var(--radius-sm)] bg-accent-soft px-1.5 text-[11px] font-medium text-accent"
        >
          {tag}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex h-5 items-center rounded-[var(--radius-sm)] bg-surface-2 px-1.5 text-[11px] font-medium text-fg-subtle">
          +{rest}
        </span>
      )}
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
  const text =
    status === 'overdue'
      ? m.opp_due_overdue({ date: formatDateShort(date) })
      : status === 'today'
        ? m.opp_due_today()
        : formatDateShort(date)
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium',
        tone,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {text}
    </span>
  )
}
