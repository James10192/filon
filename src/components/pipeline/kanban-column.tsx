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
        'flex w-[300px] shrink-0 snap-start flex-col rounded-[var(--radius-lg)] bg-surface-2 transition-opacity',
        isClosing && draggingId === null && 'opacity-80',
      )}
    >
      {/* En-tête */}
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span
          className={cn('size-2 shrink-0 rounded-full', meta.dotClass)}
          aria-hidden
        />
        <h2 className="truncate text-sm font-semibold text-fg">
          {meta.label}
        </h2>
        <span className="text-xs font-medium tabular-nums text-fg-subtle">
          {items.length}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {potential && (
            <span
              className="rounded-[var(--radius-sm)] bg-surface px-1.5 py-0.5 text-xs font-medium tabular-nums text-fg-muted"
              title="CA potentiel estimé sur cette colonne"
            >
              {potential}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
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
          'flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto rounded-b-[var(--radius-lg)] p-2 transition-colors',
          'max-h-[calc(100dvh-15rem)]',
          isDropTarget &&
            'bg-accent-soft ring-2 ring-inset ring-[var(--color-accent-ring)]',
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
          <div className="flex flex-1 items-center justify-center rounded-[var(--radius)] border border-dashed border-border px-3 py-6 text-center">
            <p className="text-sm text-fg-muted">Rien ici pour le moment.</p>
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
