import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { toast } from '~/components/ui/sonner'
import { KanbanCardContent } from './kanban-card'
import { KanbanColumn } from './kanban-column'
import { STAGE_META, STAGE_ORDER } from './pipeline-meta'
import type { Stage } from './pipeline-meta'
import type { Board, Opportunity } from './types'
import { applyMove, locate, normalizeBoard, stageOf } from './board-utils'

export function KanbanBoard({
  board: serverBoard,
  companyNames,
  onQuickAdd,
  onOpenCard,
}: {
  board: Board
  companyNames: Map<string, string>
  onQuickAdd: (stage: Stage) => void
  onOpenCard?: (id: Id<'opportunities'>) => void
}) {
  const move = useMutation(api.opportunities.move)
  const reorder = useMutation(api.opportunities.reorder)

  // Copie locale pour l'optimistic UI ; resynchronisée sur le serveur tant
  // qu'aucun glisser n'est en cours.
  const [local, setLocal] = useState<Board>(() => normalizeBoard(serverBoard))
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (activeId === null) setLocal(normalizeBoard(serverBoard))
  }, [serverBoard, activeId])

  const sensors = useSensors(
    // Petit seuil : un clic n'amorce pas un glisser (l'ouverture reste possible).
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const byId = useMemo(() => {
    const m = new Map<string, Opportunity>()
    for (const stage of STAGE_ORDER) for (const o of local[stage]) m.set(o._id, o)
    return m
  }, [local])

  const activeCard = activeId ? byId.get(activeId) : undefined
  const overStage = activeCard
    ? (locate(local, activeId!)?.stage ?? null)
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  // Réorganise en direct (entre et au sein des colonnes) pour un retour fluide.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeKey = String(active.id)
    const toStage = stageOf(local, String(over.id))
    if (!toStage) return
    setLocal((prev) => applyMove(prev, activeKey, String(over.id), toStage))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const activeKey = String(active.id)
    setActiveId(null)
    if (!over) return

    const origin = locate(normalizeBoard(serverBoard), activeKey)
    const target = locate(local, activeKey)
    if (!origin || !target) return

    const snapshot = normalizeBoard(serverBoard)
    const next = normalizeBoard(local)
    const orderedIds = next[target.stage].map(
      (o) => o._id as Id<'opportunities'>,
    )

    try {
      await move({
        id: activeKey as Id<'opportunities'>,
        stage: target.stage,
        order: target.index,
      })
      // Normalise les positions (0..n) de la colonne cible.
      await reorder({ stage: target.stage, orderedIds })
      if (origin.stage !== target.stage) {
        toast.success(
          `Opportunité déplacée vers « ${STAGE_META[target.stage].label} ».`,
        )
      }
    } catch {
      setLocal(snapshot)
      toast.error('Le déplacement a échoué.')
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="filon-board -mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:thin] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex snap-x snap-mandatory gap-4">
          {STAGE_ORDER.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              items={local[stage]}
              companyNames={companyNames}
              isOver={activeId !== null && overStage === stage}
              isDragActive={activeId !== null}
              onQuickAdd={onQuickAdd}
              onOpenCard={onOpenCard}
            />
          ))}
        </div>
      </div>

      {/* Calque de glisser : carte allégée qui suit le pointeur. */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="w-[284px] rotate-[1.5deg]">
            <KanbanCardContent
              opportunity={activeCard}
              companyName={
                activeCard.companyId
                  ? companyNames.get(activeCard.companyId)
                  : undefined
              }
              overlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
