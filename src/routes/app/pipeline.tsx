import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Compass, Plus, TriangleAlert } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { KanbanBoard } from '~/components/pipeline/kanban-board'
import { QuickAddDialog } from '~/components/pipeline/quick-add-dialog'
import { STAGE_ORDER, type Stage } from '~/components/pipeline/pipeline-meta'
import type { Board } from '~/components/pipeline/types'

export const Route = createFileRoute('/app/pipeline')({
  component: PipelinePage,
  head: () => ({ meta: [{ title: 'Pipeline · Filon' }] }),
})

function PipelinePage() {
  const board = useQuery(api.opportunities.board, {}) as Board | undefined
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddStage, setQuickAddStage] = useState<Stage>('lead')
  const navigate = useNavigate()

  const total = useMemo(() => {
    if (!board) return 0
    return STAGE_ORDER.reduce((n, s) => n + (board[s]?.length ?? 0), 0)
  }, [board])

  function openQuickAdd(stage: Stage) {
    setQuickAddStage(stage)
    setQuickAddOpen(true)
  }

  function openCard(id: Id<'opportunities'>) {
    navigate({ to: '/app/opportunites/$id', params: { id } })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        count={board ? total : null}
        onCreate={() => openQuickAdd('lead')}
      />

      {board === undefined ? (
        <BoardSkeleton />
      ) : total === 0 ? (
        <EmptyState onCreate={() => openQuickAdd('lead')} />
      ) : (
        <KanbanBoard
          board={board}
          onQuickAdd={openQuickAdd}
          onOpenCard={openCard}
        />
      )}

      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultStage={quickAddStage}
      />
    </div>
  )
}

function PageHeader({
  count,
  onCreate,
}: {
  count: number | null
  onCreate: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
          Pipeline
        </h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          {count === null
            ? 'Chargement de vos opportunités...'
            : count === 0
              ? 'Suivez chaque opportunité de la piste au contrat signé.'
              : `${count} opportunité${count > 1 ? 's' : ''} dans votre pipeline.`}
        </p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="size-4" />
        Ajouter une opportunité
      </Button>
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="-mx-4 overflow-hidden px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex gap-4">
        {STAGE_ORDER.slice(0, 5).map((stage) => (
          <div
            key={stage}
            className="flex w-[300px] shrink-0 flex-col rounded-[var(--radius-lg)] bg-surface-2"
          >
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-5 w-9 rounded-[var(--radius-sm)]" />
            </div>
            <div className="flex flex-col gap-2.5 p-2">
              {Array.from({ length: stage === 'lead' ? 3 : 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius)] border border-border bg-surface p-4"
                >
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="mt-3 h-5 w-24 rounded-[var(--radius-sm)]" />
                  <Skeleton className="mt-3 h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Compass className="size-7" />
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-fg">
        Aucune opportunité pour l'instant
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-fg-muted">
        Ajoutez votre première piste pour démarrer. Candidatures, propositions
        et missions vivent toutes dans ce tableau.
      </p>
      <Button className="mt-6" onClick={onCreate}>
        <Plus className="size-4" />
        Ajouter une opportunité
      </Button>
    </div>
  )
}

/**
 * Encart d'erreur réutilisable. Convex remonte les erreurs via Error Boundary ;
 * cet état couvre un échec de chargement explicite si la query renvoie une
 * erreur capturée plus haut. Conservé pour compléter les 4 états.
 */
export function PipelineError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-danger-soft p-4">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="text-sm font-medium text-danger">
          Impossible de charger le pipeline.
        </p>
        <p className="mt-0.5 text-sm text-fg-muted">
          Vérifiez votre connexion puis réessayez.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  )
}
