import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, CalendarClock, Radio, User } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import {
  PRIORITY_META,
  SOURCE_META,
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
 *
 * Hiérarchie : entreprise (secondaire) en surtitre, intitulé (primaire),
 * indicateur de type discret + lieu, et un pied avec la valeur (assay-mono) et
 * la relance. Pas de badge bruyant : le type est un point teinté.
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
  const tone = followupTone(opportunity.nextActionAt)
  const priority = PRIORITY_META[opportunity.priority]
  // Seules les priorités haute / basse portent un point ; moyenne reste neutre.
  const showPriority = opportunity.priority !== 'medium'
  const hasFooter = Boolean(opportunity.compensation) || Boolean(tone)

  // Cible : nom + nature (entreprise / particulier). companyName provient de
  // l'enrichissement serveur ; fallback sur le nom résolu côté colonne.
  const targetType =
    opportunity.effectiveTargetType ??
    opportunity.targetType ??
    (opportunity.companyId
      ? 'company'
      : opportunity.contactId
        ? 'person'
        : 'none')
  const targetName =
    opportunity.companyName ?? companyName ?? opportunity.contactName
  const TargetIcon = targetType === 'person' ? User : Building2

  // Source : « canal · précision », repli sur la source libre historique.
  const source =
    (opportunity.sourceChannel
      ? SOURCE_META[opportunity.sourceChannel].label
      : '') +
    (opportunity.sourceChannel && opportunity.sourceDetail ? ' · ' : '') +
    (opportunity.sourceDetail ?? '')
  const sourceText =
    source.trim().length > 0 ? source.trim() : (opportunity.source ?? '')

  const tags = opportunity.tags.slice(0, 2)
  const restTags = opportunity.tags.length - tags.length

  return (
    <div
      style={{ borderLeftColor: STAGE_LEFT_VAR[opportunity.stage] }}
      className={cn(
        'group/card relative rounded-[var(--radius)] border border-border border-l-2 bg-surface px-3 py-2.5 text-left outline-none',
        overlay
          ? 'cursor-grabbing shadow-[var(--shadow-pop)] ring-1 ring-[var(--color-accent-ring)]'
          : 'transition-colors duration-150 hover:border-border-strong hover:bg-surface-2/40',
      )}
    >
      {/* Surtitre : cible (entreprise / particulier), ou type si pas de cible. */}
      <div className="flex items-center gap-1.5">
        {targetName ? (
          <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-medium uppercase tracking-[0.04em] text-fg-subtle">
            <TargetIcon className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{targetName}</span>
          </span>
        ) : (
          <span className="truncate text-[11px] font-medium uppercase tracking-[0.04em] text-fg-subtle">
            {type.label}
          </span>
        )}
        {showPriority && (
          <span
            className={cn(
              'ml-auto size-1.5 shrink-0 rounded-full',
              priority.dotClass,
            )}
            title={priority.label}
            aria-label={priority.label}
          />
        )}
      </div>

      {/* Intitulé : information primaire. */}
      <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-fg">
        {opportunity.title}
      </h3>

      {/* Type discret (point teinté + libellé) + lieu. */}
      <div className="mt-1.5 flex items-center gap-2 text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: `var(--color-type-${TYPE_TOKEN[opportunity.type]})` }}
            aria-hidden
          />
          {type.label}
        </span>
        {opportunity.location && (
          <>
            <span aria-hidden className="text-border-strong">
              ·
            </span>
            <span className="truncate">{opportunity.location}</span>
          </>
        )}
      </div>

      {/* Source : discrète, sur une ligne dédiée si présente. */}
      {sourceText && (
        <div
          className="mt-1.5 flex items-center gap-1.5 text-[11px] text-fg-subtle"
          title={sourceText}
        >
          <Radio className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{sourceText}</span>
        </div>
      )}

      {/* Étiquettes : jusqu'à 2 chips + compteur. */}
      {opportunity.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-5 items-center rounded-[var(--radius-sm)] bg-accent-soft px-1.5 text-[10px] font-medium text-accent"
            >
              {tag}
            </span>
          ))}
          {restTags > 0 && (
            <span className="inline-flex h-5 items-center rounded-[var(--radius-sm)] bg-surface-2 px-1.5 text-[10px] font-medium text-fg-subtle">
              +{restTags}
            </span>
          )}
        </div>
      )}

      {hasFooter && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/70 pt-2 text-xs">
          {opportunity.compensation ? (
            <span className="assay min-w-0 truncate font-semibold text-fg">
              {opportunity.compensation}
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
                m.opp_due_overdue_short()
              ) : tone === 'today' ? (
                m.opp_due_today()
              ) : (
                <span className="assay">
                  {formatShortDate(opportunity.nextActionAt)}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Jeton de couleur du type pour le point discret (aligné sur TYPE_META). */
const TYPE_TOKEN: Record<Opportunity['type'], string> = {
  job_offer: 'application',
  spontaneous: 'pitch',
  prospect: 'prospect',
  mission: 'mission',
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
      aria-label={m.opp_card_aria({ title: opportunity.title })}
      onClick={() => onOpen?.(opportunity._id)}
      onKeyDown={(e) => {
        // Espace est réservé au glisser clavier de dnd-kit ; on n'ouvre qu'avec Entrée.
        if (e.key === 'Enter') {
          e.preventDefault()
          onOpen?.(opportunity._id)
        }
      }}
      className={cn(
        'cursor-grab touch-none select-none rounded-[var(--radius)] outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]',
        'active:cursor-grabbing',
        // Laisse une empreinte calme à la place de la carte pendant le glisser.
        isDragging && 'opacity-40',
      )}
    >
      <KanbanCardContent opportunity={opportunity} companyName={companyName} />
    </div>
  )
}
