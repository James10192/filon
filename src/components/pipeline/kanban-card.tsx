import { Coins, CalendarClock } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  PRIORITY_META,
  TYPE_META,
  followupTone,
  formatShortDate,
} from './pipeline-meta'
import type { Opportunity } from './types'

/** Couleur du liseré gauche de la carte selon l'étape (var --color-stage-*). */
const STAGE_LEFT_VAR: Record<Opportunity['stage'], string> = {
  lead: 'var(--color-stage-lead)',
  contacted: 'var(--color-stage-contacted)',
  applied: 'var(--color-stage-applied)',
  interview: 'var(--color-stage-interview)',
  negotiation: 'var(--color-stage-negotiation)',
  won: 'var(--color-stage-won)',
  lost: 'var(--color-stage-lost)',
}

const TONE_DOT: Record<'overdue' | 'today' | 'upcoming', string> = {
  overdue: 'bg-danger',
  today: 'bg-warning',
  upcoming: 'bg-[var(--color-fg-subtle)]',
}

const TONE_TEXT: Record<'overdue' | 'today' | 'upcoming', string> = {
  overdue: 'text-danger',
  today: 'text-warning',
  upcoming: 'text-fg-subtle',
}

export function KanbanCard({
  opportunity,
  companyName,
  dragging = false,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  opportunity: Opportunity
  companyName?: string
  dragging?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  onOpen?: (id: Opportunity['_id']) => void
}) {
  const type = TYPE_META[opportunity.type]
  const TypeIcon = type.icon
  const tone = followupTone(opportunity.nextActionAt)
  const priority = PRIORITY_META[opportunity.priority]
  // Seules les priorités haute / basse portent un point ; moyenne reste neutre.
  const showPriority = opportunity.priority !== 'medium'
  const hasFooter = Boolean(opportunity.compensation) || Boolean(tone)

  return (
    <article
      draggable
      role="button"
      tabIndex={0}
      aria-label={`Opportunité ${opportunity.title}`}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        // Donnée requise sur Firefox pour autoriser le drag.
        e.dataTransfer.setData('text/plain', opportunity._id)
        onDragStart?.()
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen?.(opportunity._id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.(opportunity._id)
        }
      }}
      style={{ borderLeftColor: STAGE_LEFT_VAR[opportunity.stage] }}
      className={cn(
        'group cursor-grab select-none rounded-lg border border-border border-l-[3px] bg-surface p-3.5 text-left shadow-[var(--shadow-card)] outline-none transition duration-150',
        'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-pop)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-2)]',
        'active:cursor-grabbing',
        dragging && 'rotate-[1deg] opacity-60 shadow-[var(--shadow-pop)]',
      )}
    >
      <div className="flex items-start gap-1.5">
        {showPriority && (
          <span
            className={cn(
              'mt-1 size-1.5 shrink-0 rounded-full',
              priority.dotClass,
            )}
            title={priority.label}
            aria-label={priority.label}
          />
        )}
        <h3 className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-fg">
          {opportunity.title}
        </h3>
      </div>

      {companyName && (
        <p className="mt-1 truncate text-xs text-fg-muted">{companyName}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn(
            'inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium',
            type.fgClass,
          )}
        >
          <TypeIcon className="size-3.5" />
          {type.label}
        </span>
        {opportunity.location && (
          <span className="truncate text-xs text-fg-subtle">
            {opportunity.location}
          </span>
        )}
      </div>

      {hasFooter && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          {opportunity.compensation ? (
            <span className="inline-flex min-w-0 items-center gap-1 text-accent">
              <Coins className="size-3.5 shrink-0 opacity-80" />
              <span className="truncate font-semibold tabular-nums">
                {opportunity.compensation}
              </span>
            </span>
          ) : (
            <span />
          )}

          {tone && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium',
                TONE_TEXT[tone],
              )}
            >
              <span
                className={cn(
                  'inline-block size-1.5 rounded-full',
                  TONE_DOT[tone],
                )}
                aria-hidden
              />
              <CalendarClock className="size-3.5" />
              {tone === 'overdue'
                ? 'En retard'
                : tone === 'today'
                  ? "Aujourd'hui"
                  : formatShortDate(opportunity.nextActionAt)}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
