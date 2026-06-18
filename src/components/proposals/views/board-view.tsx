import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { Building2, Plus, Send, Users } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import {
  PROPOSAL_STATUSES,
  STATUS_LABELS,
  formatAmount,
  type ProposalStatus,
} from '../proposal-status'
import {
  recipientSummaryLabel,
  type RecipientSummary,
} from '../recipient-status'
import { useRecipientSummaries } from '../use-recipient-summaries'

type ProposalRow = Doc<'proposals'> & { companyName?: string }

/** Veine d'accent en tête de colonne, par statut. */
const STATUS_VEIN: Record<ProposalStatus, string> = {
  draft: 'bg-fg-subtle',
  sent: 'bg-info',
  accepted: 'bg-success',
  refused: 'bg-danger',
}

/**
 * Vue Tableau : une colonne par statut de proposition. Lecture seule (le statut
 * se change via les actions de la carte / du détail). Le clic sur une carte
 * sélectionne (ouvre le panneau split via `onSelect`).
 */
export function BoardView({
  onSelect,
  selectedId,
  onCreate,
}: {
  onSelect: (id: Id<'proposals'>) => void
  selectedId?: Id<'proposals'> | null
  onCreate: () => void
}) {
  const proposals = useQuery(api.proposals.list, {}) as
    | ProposalRow[]
    | undefined
  const recipientSummaries = useRecipientSummaries()

  const columns = useMemo(() => {
    const map: Record<ProposalStatus, ProposalRow[]> = {
      draft: [],
      sent: [],
      accepted: [],
      refused: [],
    }
    if (proposals) {
      for (const p of proposals) {
        const s = p.status as ProposalStatus
        if (map[s]) map[s].push(p)
      }
    }
    return map
  }, [proposals])

  if (proposals === undefined) return <BoardSkeleton />
  if (proposals.length === 0) return <EmptyState onCreate={onCreate} />

  return (
    <div className="-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-1 md:-mx-6 md:snap-none md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-w-max gap-4">
        {PROPOSAL_STATUSES.map((status) => {
          const items = columns[status]
          return (
            <section
              key={status}
              className="flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] sm:w-[300px]"
            >
              <span className={`h-px w-full ${STATUS_VEIN[status]}`} />
              <header className="flex items-center gap-2 px-3.5 pb-2.5 pt-3">
                <span
                  className={`size-1.5 rounded-full ${STATUS_VEIN[status]}`}
                />
                <h2 className="text-sm font-semibold text-fg">
                  {STATUS_LABELS[status]}
                </h2>
                <span className="assay ml-auto rounded-[var(--radius-sm)] bg-surface-2 px-1.5 text-xs text-fg-muted">
                  {items.length}
                </span>
              </header>
              <div className="flex flex-col gap-2 px-2.5 pb-2.5">
                {items.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-fg-subtle">
                    {m.prop_board_column_empty()}
                  </p>
                ) : (
                  items.map((p) => (
                    <BoardCard
                      key={p._id}
                      proposal={p}
                      recipientSummary={recipientSummaries?.get(p._id)}
                      selected={selectedId === p._id}
                      onSelect={() => onSelect(p._id)}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function BoardCard({
  proposal,
  recipientSummary,
  selected,
  onSelect,
}: {
  proposal: ProposalRow
  recipientSummary?: RecipientSummary
  selected: boolean
  onSelect: () => void
}) {
  const amount = formatAmount(proposal.amount, proposal.currency)
  const recipientLabel = recipientSummary
    ? recipientSummaryLabel(recipientSummary)
    : null
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={`flex flex-col gap-1.5 rounded-[var(--radius)] border bg-surface px-3 py-2.5 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] ${
        selected ? 'border-accent' : 'border-border'
      }`}
    >
      <span className="line-clamp-2 text-sm font-medium text-fg">
        {proposal.title}
      </span>
      <span className="flex items-center gap-1.5 truncate text-xs text-fg-subtle">
        {recipientLabel ? (
          <>
            <Users className="size-3 shrink-0" />
            <span className="truncate">{recipientLabel}</span>
          </>
        ) : proposal.companyName ? (
          <>
            <Building2 className="size-3 shrink-0" />
            <span className="truncate">{proposal.companyName}</span>
          </>
        ) : (
          m.prop_no_target_company()
        )}
      </span>
      {amount && (
        <span className="assay text-xs font-medium text-fg-muted">{amount}</span>
      )}
    </button>
  )
}

function BoardSkeleton() {
  return (
    <div className="-mx-4 overflow-hidden px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex gap-4">
        {PROPOSAL_STATUSES.map((status) => (
          <div
            key={status}
            className="flex w-[82vw] max-w-[300px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] sm:w-[300px]"
          >
            <Skeleton className="h-px w-full rounded-none" />
            <div className="flex items-center gap-2 px-3.5 pb-2.5 pt-3">
              <Skeleton className="size-1.5 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-10 rounded-[var(--radius-sm)]" />
            </div>
            <div className="flex flex-col gap-2 px-2.5 pb-2.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5"
                >
                  <Skeleton className="h-4 w-4/5" />
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
        <Send className="size-7" />
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-fg">
        {m.prop_empty_title()}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-fg-muted">
        {m.prop_board_empty_message()}
      </p>
      <Button className="mt-6 h-11" onClick={onCreate}>
        <Plus className="size-4" />
        {m.prop_new()}
      </Button>
    </div>
  )
}
