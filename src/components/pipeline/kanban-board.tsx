import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { toast } from '~/components/ui/sonner'
import { KanbanColumn } from './kanban-column'
import { STAGE_META, STAGE_ORDER } from './pipeline-meta'
import type { Stage } from './pipeline-meta'
import type { Board, Opportunity } from './types'

type DragState = { id: string; from: Stage } | null

function emptyBoard(): Board {
  return {
    lead: [],
    contacted: [],
    applied: [],
    interview: [],
    negotiation: [],
    won: [],
    lost: [],
  }
}

/** Recompose un board complet à partir d'une source serveur partielle. */
function normalizeBoard(source: Board | undefined): Board {
  const base = emptyBoard()
  if (!source) return base
  for (const stage of STAGE_ORDER) {
    base[stage] = source[stage] ? [...source[stage]] : []
  }
  return base
}

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
  // qu'aucun drag n'est en cours.
  const [local, setLocal] = useState<Board>(() => normalizeBoard(serverBoard))
  const drag = useRef<DragState>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (draggingId === null) setLocal(normalizeBoard(serverBoard))
  }, [serverBoard, draggingId])

  const byId = useMemo(() => {
    const m = new Map<string, Opportunity>()
    for (const stage of STAGE_ORDER) {
      for (const o of local[stage]) m.set(o._id, o)
    }
    return m
  }, [local])

  function handleCardDragStart(id: string, from: Stage) {
    drag.current = { id, from }
    setDraggingId(id)
  }

  function handleColumnDragOver(stage: Stage, index: number) {
    setOverStage(stage)
    setOverIndex(index)
  }

  function handleColumnDragLeave(stage: Stage) {
    setOverStage((cur) => (cur === stage ? null : cur))
  }

  function resetDrag() {
    drag.current = null
    setDraggingId(null)
    setOverStage(null)
    setOverIndex(null)
  }

  async function handleColumnDrop(toStage: Stage) {
    const current = drag.current
    const targetIndex = overIndex
    if (!current) {
      resetDrag()
      return
    }
    const card = byId.get(current.id)
    if (!card) {
      resetDrag()
      return
    }

    // Liste cible sans la carte déplacée (si elle vient de la même colonne).
    const destSansCard = local[toStage].filter((o) => o._id !== current.id)
    const insertAt =
      targetIndex === null
        ? destSansCard.length
        : Math.max(0, Math.min(targetIndex, destSansCard.length))

    const sameSpot =
      current.from === toStage &&
      local[toStage].findIndex((o) => o._id === current.id) === insertAt

    if (sameSpot) {
      resetDrag()
      return
    }

    // Snapshot pour rollback.
    const snapshot = normalizeBoard(local)

    // Mise à jour optimiste.
    const next = normalizeBoard(local)
    next[current.from] = next[current.from].filter(
      (o) => o._id !== current.id,
    )
    const movedCard: Opportunity = { ...card, stage: toStage }
    const dest = next[toStage].filter((o) => o._id !== current.id)
    dest.splice(insertAt, 0, movedCard)
    next[toStage] = dest.map((o, i) => ({ ...o, order: i }))
    if (current.from !== toStage) {
      next[current.from] = next[current.from].map((o, i) => ({
        ...o,
        order: i,
      }))
    }
    setLocal(next)
    resetDrag()

    const orderedIds = next[toStage].map((o) => o._id as Id<'opportunities'>)

    try {
      await move({
        id: current.id as Id<'opportunities'>,
        stage: toStage,
        order: insertAt,
      })
      // Normalise les positions (0..n) de la colonne cible.
      await reorder({ stage: toStage, orderedIds })
      if (current.from !== toStage) {
        toast.success(
          `Opportunité déplacée vers « ${STAGE_META[toStage].label} ».`,
        )
      }
    } catch {
      setLocal(snapshot)
      toast.error('Le déplacement a échoué.')
    }
  }

  return (
    <div className="filon-board -mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:thin] md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex snap-x snap-mandatory gap-4">
        {STAGE_ORDER.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            items={local[stage]}
            companyNames={companyNames}
            draggingId={draggingId}
            isDropTarget={overStage === stage && draggingId !== null}
            dropIndex={overStage === stage ? overIndex : null}
            onQuickAdd={onQuickAdd}
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={resetDrag}
            onColumnDragOver={handleColumnDragOver}
            onColumnDrop={handleColumnDrop}
            onColumnDragLeave={handleColumnDragLeave}
            onOpenCard={onOpenCard}
          />
        ))}
      </div>
    </div>
  )
}
