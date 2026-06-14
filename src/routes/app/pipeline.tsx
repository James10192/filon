import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Compass, Plus, TriangleAlert } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { PageToolbar } from '~/components/app/page-toolbar'
import { useQuickCapture } from '~/components/app/quick-capture'
import { KanbanBoard } from '~/components/pipeline/kanban-board'
import { QuickAddDialog } from '~/components/pipeline/quick-add-dialog'
import {
  STAGE_ORDER,
  formatPotential,
  parseCompensation,
  type Stage,
} from '~/components/pipeline/pipeline-meta'
import type { Board } from '~/components/pipeline/types'

export const Route = createFileRoute('/app/pipeline')({
  component: PipelinePage,
  head: () => ({ meta: [{ title: 'Pipeline · Filon' }] }),
})

function PipelinePage() {
  const board = useQuery(api.opportunities.board, {}) as Board | undefined
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddStage, setQuickAddStage] = useState<Stage>('lead')
  const quickCapture = useQuickCapture()
  const navigate = useNavigate()

  const { total, totalValue } = useMemo(() => {
    if (!board) return { total: 0, totalValue: 0 }
    let count = 0
    let value = 0
    for (const s of STAGE_ORDER) {
      const items = board[s] ?? []
      count += items.length
      // Le pipeline actif exclut les opportunités perdues du potentiel.
      if (s !== 'lost') {
        for (const o of items) value += parseCompensation(o.compensation)
      }
    }
    return { total: count, totalValue: value }
  }, [board])

  function openQuickAdd(stage: Stage) {
    setQuickAddStage(stage)
    setQuickAddOpen(true)
  }

  function openCard(id: Id<'opportunities'>) {
    navigate({ to: '/app/opportunites/$id', params: { id } })
  }

  const potential = formatPotential(totalValue)

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Pipeline"
        subtitle="De la piste au contrat signé, tout au même endroit."
        actions={
          <>
            {board && potential && (
              <span
                className="hidden h-9 items-center gap-2 rounded-full border border-border bg-surface pl-2.5 pr-3 text-sm font-medium sm:inline-flex"
                title="Valeur potentielle cumulée du pipeline actif"
              >
                <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                <span className="text-fg-subtle">Potentiel</span>
                <span className="font-semibold tabular-nums text-fg">
                  {potential}
                </span>
              </span>
            )}
            <Button onClick={() => quickCapture.open()}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Ajouter une opportunité</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </>
        }
      />

      {board === undefined ? (
        <BoardSkeleton />
      ) : total === 0 ? (
        <EmptyState onCreate={() => quickCapture.open()} />
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

function BoardSkeleton() {
  return (
    <div className="-mx-4 overflow-hidden px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex gap-4">
        {STAGE_ORDER.slice(0, 5).map((stage) => (
          <div
            key={stage}
            className="flex w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-2/60"
          >
            <Skeleton className="h-[3px] w-full rounded-none" />
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-12 rounded-[var(--radius-sm)]" />
            </div>
            <div className="flex flex-col gap-2.5 p-2.5">
              {Array.from({ length: stage === 'lead' ? 3 : 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius)] border border-border bg-surface p-3"
                >
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="mt-2.5 h-5 w-20 rounded-[var(--radius-sm)]" />
                  <Skeleton className="mt-2.5 h-3 w-1/2" />
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
      <Button className="mt-6 h-11" onClick={onCreate}>
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
