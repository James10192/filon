import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarClock, Coins, GripVertical } from 'lucide-react'
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

/**
 * Contenu visuel d'une carte, sans logique de drag. Réutilisé tel quel dans
 * la carte triable et dans le calque de glisser (DragOverlay).
 */
export function KanbanCardContent({
  opportunity,
  companyName,
  overlay = false,
}: {
  opportunity: Opportunity
  companyName?: string
  overlay?: boolean
}) {
  const type = TYPE_META[opportunity.type]
  const TypeIcon = type.icon
  const tone = followupTone(opportunity.nextActionAt)
  const priority = PRIORITY_META[opportunity.priority]
  // Seules les priorités haute / basse portent un point ; moyenne reste neutre.
  const showPriority = opportunity.priority !== 'medium'
  const hasFooter = Boolean(opportunity.compensation) || Boolean(tone)

  return (
    <div
      style={{ borderLeftColor: STAGE_LEFT_VAR[opportunity.stage] }}
      className={cn(
        'group/card relative rounded-lg border border-border border-l-[3px] bg-surface p-3.5 text-left outline-none',
        overlay
          ? 'cursor-grabbing rotate-[1.5deg] shadow-[var(--shadow-pop)]'
          : 'shadow-[var(--shadow-card)] transition duration-150 hover:border-border-strong hover:shadow-[var(--shadow-pop)]',
      )}
    >
      {/* Poignée discrète : repère de prise, révélée au survol. */}
      <span
        className={cn(
          'pointer-events-none absolute right-2 top-2 text-fg-subtle/70 transition-opacity',
          overlay ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100',
        )}
        aria-hidden
      >
        <GripVertical className="size-3.5" />
      </span>

      <div className="flex items-start gap-1.5 pr-4">
        {showPriority && (
          <span
            className={cn('mt-1 size-1.5 shrink-0 rounded-full', priority.dotClass)}
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
              <span className="assay truncate font-semibold">
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
                className={cn('inline-block size-1.5 rounded-full', TONE_DOT[tone])}
                aria-hidden
              />
              <CalendarClock className="size-3.5" />
              {tone === 'overdue' ? (
                'En retard'
              ) : tone === 'today' ? (
                "Aujourd'hui"
              ) : (
                <span className="assay">{formatShortDate(opportunity.nextActionAt)}</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Carte triable : branche dnd-kit (drag souris + clavier accessible) sur le
 * contenu visuel. L'ouverture se déclenche au clic / Entrée seulement si aucun
 * glisser n'a eu lieu.
 */
export function SortableKanbanCard({
  opportunity,
  companyName,
  onOpen,
}: {
  opportunity: Opportunity
  companyName?: string
  onOpen?: (id: Opportunity['_id']) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity._id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`Opportunité ${opportunity.title}`}
      onClick={() => onOpen?.(opportunity._id)}
      onKeyDown={(e) => {
        // Espace est réservé au glisser clavier de dnd-kit ; on n'ouvre qu'avec Entrée.
        if (e.key === 'Enter') {
          e.preventDefault()
          onOpen?.(opportunity._id)
        }
      }}
      className={cn(
        'cursor-grab touch-none select-none rounded-lg outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-2)]',
        'active:cursor-grabbing',
        // Laisse une empreinte calme à la place de la carte pendant le glisser.
        isDragging && 'opacity-40',
      )}
    >
      <KanbanCardContent opportunity={opportunity} companyName={companyName} />
    </div>
  )
}
