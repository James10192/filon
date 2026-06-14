import { Plus } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { KanbanCard } from './kanban-card'
import {
  STAGE_META,
  formatPotential,
  parseCompensation,
} from './pipeline-meta'
import type { Stage } from './pipeline-meta'
import type { Opportunity } from './types'

export function KanbanColumn({
  stage,
  items,
  companyNames,
  draggingId,
  isDropTarget,
  dropIndex,
  onQuickAdd,
  onCardDragStart,
  onCardDragEnd,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragLeave,
  onOpenCard,
}: {
  stage: Stage
  items: Opportunity[]
  companyNames: Map<string, string>
  draggingId: string | null
  isDropTarget: boolean
  dropIndex: number | null
  onQuickAdd: (stage: Stage) => void
  onCardDragStart: (id: string, stage: Stage) => void
  onCardDragEnd: () => void
  onColumnDragOver: (stage: Stage, index: number) => void
  onColumnDrop: (stage: Stage) => void
  onColumnDragLeave: (stage: Stage) => void
  onOpenCard?: (id: Opportunity['_id']) => void
}) {
  const meta = STAGE_META[stage]
  const total = items.reduce(
    (sum, o) => sum + parseCompensation(o.compensation),
    0,
  )
  const potential = formatPotential(total)
  const isClosing = stage === 'lost'

  return (
    <section
      aria-label={`Colonne ${meta.label}`}
      className={cn(
        'group/col flex w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-surface-2/60 transition-opacity',
        isClosing && draggingId === null && 'opacity-75',
      )}
    >
      {/* Liseré supérieur coloré (couleur de l'étape). */}
      <div
        className={cn('h-[3px] w-full shrink-0', meta.dotClass)}
        aria-hidden
      />

      {/* En-tête sticky : pastille + nom + compte + valeur cumulée + quick-add */}
      <header className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-border/60 bg-surface-2/80 px-3 py-2.5 backdrop-blur">
        <span
          className={cn('size-2 shrink-0 rounded-full', meta.dotClass)}
          aria-hidden
        />
        <h2 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-fg">
          {meta.label}
        </h2>
        <span className="rounded-full bg-surface px-1.5 text-xs font-medium tabular-nums text-fg-muted ring-1 ring-border/60">
          {items.length}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {potential && (
            <span
              className="text-xs font-semibold tabular-nums text-fg-muted"
              title={`Valeur potentielle cumulée sur « ${meta.label} »`}
            >
              {potential}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-fg-subtle opacity-70 transition-opacity hover:text-fg hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover/col:opacity-100"
            aria-label={`Ajouter une opportunité dans « ${meta.label} »`}
            onClick={() => onQuickAdd(stage)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </header>

      {/* Corps : zone de dépôt scrollable */}
      <div
        className={cn(
          'flex min-h-[7rem] flex-col gap-2.5 overflow-y-auto p-2.5 transition-colors [scrollbar-width:thin]',
          'max-h-[calc(100dvh-13rem)]',
          isDropTarget &&
            'bg-accent-soft/60 ring-2 ring-inset ring-[var(--color-accent-ring)]',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          // Sans survol précis d'une carte, on vise la fin de colonne.
          if (!isDropTarget) onColumnDragOver(stage, items.length)
        }}
        onDrop={(e) => {
          e.preventDefault()
          onColumnDrop(stage)
        }}
        onDragLeave={(e) => {
          // N'efface que si on quitte réellement la colonne (pas un enfant).
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            onColumnDragLeave(stage)
          }
        }}
      >
        {items.length === 0 ? (
          <div
            className={cn(
              'flex min-h-[5.5rem] flex-1 items-center justify-center rounded-[var(--radius)] border border-dashed px-3 py-8 text-center transition-colors',
              isDropTarget
                ? 'border-[var(--color-accent)] text-accent'
                : 'border-border/70 text-fg-subtle',
            )}
          >
            <p className="text-xs">Glissez une opportunité ici</p>
          </div>
        ) : (
          items.map((opportunity, index) => (
            <div key={opportunity._id}>
              {isDropTarget && dropIndex === index && <DropIndicator />}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const after = e.clientY - rect.top > rect.height / 2
                  onColumnDragOver(stage, after ? index + 1 : index)
                }}
              >
                <KanbanCard
                  opportunity={opportunity}
                  companyName={
                    opportunity.companyId
                      ? companyNames.get(opportunity.companyId)
                      : undefined
                  }
                  dragging={draggingId === opportunity._id}
                  onDragStart={() =>
                    onCardDragStart(opportunity._id, stage)
                  }
                  onDragEnd={onCardDragEnd}
                  onOpen={onOpenCard}
                />
              </div>
            </div>
          ))
        )}
        {isDropTarget && dropIndex === items.length && items.length > 0 && (
          <DropIndicator />
        )}
      </div>
    </section>
  )
}

function DropIndicator() {
  return (
    <div
      className="mb-1 h-0.5 rounded-full bg-accent"
      aria-hidden
    />
  )
}
