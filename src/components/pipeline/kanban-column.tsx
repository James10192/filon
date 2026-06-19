import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Inbox, Plus } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { SortableKanbanCard } from './kanban-card'
import { STAGE_META, formatPotential, parseCompensation } from './pipeline-meta'
import type { Stage } from './pipeline-meta'
import type { Opportunity } from './types'

export function KanbanColumn({
  stage,
  items,
  companyNames,
  isOver,
  isDragActive,
  onQuickAdd,
  onOpenCard,
  labelOf,
}: {
  stage: Stage
  items: Opportunity[]
  companyNames: Map<string, string>
  isOver: boolean
  isDragActive: boolean
  onQuickAdd: (stage: Stage) => void
  onOpenCard?: (id: Opportunity['_id']) => void
  labelOf?: (stage: Stage) => string
}) {
  const meta = STAGE_META[stage]
  // Titre persona-aware : libelle resolu par le lens du user, defaut = STAGE_META.
  // Les COULEURS (dot/chip) restent fournies par `meta` quel que soit le lens.
  const title = labelOf?.(stage) ?? meta.label
  const total = items.reduce(
    (sum, o) => sum + parseCompensation(o.compensation),
    0,
  )
  const potential = formatPotential(total)
  // Le « gagné » est la seule colonne à porter l'accent (veine indigo) ;
  // les autres gardent leur couleur d'étape sobre.
  const isWon = stage === 'won'
  const isClosing = stage === 'lost'
  const { setNodeRef } = useDroppable({ id: `col:${stage}`, data: { stage } })

  return (
    <section
      aria-label={m.opp_column_aria({ stage: title })}
      className={cn(
        // Mobile : colonne fluide qui laisse entrevoir la suivante (indice de
        // scroll horizontal). >= sm : largeur fixe 304px.
        'flex w-[82vw] max-w-[304px] shrink-0 snap-start flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] transition-opacity sm:w-[304px]',
        isClosing && !isDragActive && 'opacity-70',
      )}
    >
      {/* Liseré supérieur fin : couleur d'étape, accent indigo pour « gagné ». */}
      <div
        className={cn('h-px w-full shrink-0', isWon ? 'bg-accent' : meta.dotClass)}
        aria-hidden
      />

      {/* En-tête calme : nom + compte mono + valeur cumulée mono + quick-add. */}
      <header className="group/head flex items-center gap-2 px-3.5 pb-2.5 pt-3">
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            isWon ? 'bg-accent' : meta.dotClass,
          )}
          aria-hidden
        />
        <h2 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-fg">
          {title}
        </h2>
        <span className="assay text-xs font-medium tabular-nums text-fg-subtle">
          {items.length}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {potential && (
            <span
              className="assay text-xs font-semibold text-fg-muted"
              title={m.opp_column_potential_title({ stage: title })}
            >
              {potential}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="-mr-1 size-7 text-fg-subtle opacity-70 transition-opacity hover:text-fg hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover/head:opacity-100"
            aria-label={m.opp_column_add_aria({ stage: title })}
            onClick={() => onQuickAdd(stage)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </header>

      {/* Corps : zone de dépôt scrollable, surlignée quand survolée en glisser. */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[6rem] flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5 transition-colors [scrollbar-width:thin]',
          'max-h-[calc(100dvh-12.5rem)]',
          isOver && 'bg-accent-soft/40',
        )}
      >
        <SortableContext
          items={items.map((o) => o._id)}
          strategy={verticalListSortingStrategy}
        >
          {items.length === 0 ? (
            <EmptyColumn label={title} isOver={isOver} />
          ) : (
            items.map((opportunity) => (
              <SortableKanbanCard
                key={opportunity._id}
                opportunity={opportunity}
                companyName={
                  opportunity.companyId
                    ? companyNames.get(opportunity.companyId)
                    : undefined
                }
                onOpen={onOpenCard}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  )
}

/** État vide d'une colonne : repère discret, jamais un simple « aucune donnée ». */
function EmptyColumn({ label, isOver }: { label: string; isOver: boolean }) {
  return (
    <div
      className={cn(
        'flex min-h-[5rem] flex-1 flex-col items-center justify-center gap-1.5 rounded-[var(--radius)] border border-dashed px-3 py-7 text-center transition-colors',
        isOver
          ? 'border-[var(--color-accent)] bg-accent-soft/40 text-accent'
          : 'border-border bg-surface-2/50 text-fg-subtle',
      )}
    >
      <Inbox className="size-4 opacity-60" aria-hidden />
      <p className="text-xs leading-snug">
        {m.opp_column_empty_drop()}
        <br />
        <span className="text-fg-subtle/70">{m.opp_column_empty_for({ stage: label })}</span>
      </p>
    </div>
  )
}
