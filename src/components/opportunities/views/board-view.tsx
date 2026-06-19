import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { Compass, Plus } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { KanbanBoard } from '~/components/pipeline/kanban-board'
import { QuickAddDialog } from '~/components/pipeline/quick-add-dialog'
import { STAGE_ORDER, type Stage } from '~/components/pipeline/pipeline-meta'
import type { Board } from '~/components/pipeline/types'
import { useStageLabels } from '~/components/opportunities/use-stage-labels'

/**
 * Vue Tableau (kanban dnd-kit) intégrée au switcher. Le contrat de mutation
 * « persist on drop » (`move` + `reorder`) reste inchangé : on réutilise
 * `KanbanBoard` tel quel. Le clic sur une carte sélectionne (panneau split).
 */
export function BoardView({
  onSelect,
  onCreate,
}: {
  onSelect: (id: Id<'opportunities'>) => void
  onCreate: () => void
}) {
  const board = useQuery(api.opportunities.board, {}) as Board | undefined
  const companies = useQuery(api.companies.list, {})
  const { label } = useStageLabels()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddStage, setQuickAddStage] = useState<Stage>('lead')

  const total = useMemo(() => {
    if (!board) return 0
    let count = 0
    for (const s of STAGE_ORDER) count += (board[s] ?? []).length
    return count
  }, [board])

  const companyNames = useMemo(() => {
    const map = new Map<string, string>()
    if (companies) for (const c of companies) map.set(c._id, c.name)
    return map
  }, [companies])

  function openQuickAdd(stage: Stage) {
    setQuickAddStage(stage)
    setQuickAddOpen(true)
  }

  return (
    <div className="flex flex-col">
      {board === undefined ? (
        <BoardSkeleton />
      ) : total === 0 ? (
        <EmptyState onCreate={onCreate} />
      ) : (
        <KanbanBoard
          board={board}
          companyNames={companyNames}
          onQuickAdd={openQuickAdd}
          onOpenCard={onSelect}
          labelOf={label}
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
            className="flex w-[82vw] max-w-[304px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] sm:w-[304px]"
          >
            <Skeleton className="h-px w-full rounded-none" />
            <div className="flex items-center gap-2 px-3.5 pb-2.5 pt-3">
              <Skeleton className="size-1.5 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-10 rounded-[var(--radius-sm)]" />
            </div>
            <div className="flex flex-col gap-2 px-2.5 pb-2.5">
              {Array.from({ length: stage === 'lead' ? 3 : 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius)] border border-border border-l-2 bg-surface px-3 py-2.5"
                >
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="mt-2 h-4 w-4/5" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
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
        {m.opp_empty_title()}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-fg-muted">
        {m.opp_board_empty_message()}
      </p>
      <Button className="mt-6 h-11" onClick={onCreate}>
        <Plus className="size-4" />
        {m.opp_add_opportunity()}
      </Button>
    </div>
  )
}
