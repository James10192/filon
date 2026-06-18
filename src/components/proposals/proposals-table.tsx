import { useMemo } from 'react'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { DataTable } from '~/components/data-table'
import { ProposalCard } from './proposal-card'
import { buildProposalColumns } from './proposal-columns'
import type { RecipientSummary } from './recipient-status'

type ProposalRow = Doc<'proposals'> & { companyName?: string }

/**
 * Tableau dense des propositions sur TanStack Table. < md : bascule en cartes
 * (la carte porte les actions de statut riches, mieux adaptees au tactile).
 * Le clic sur une ligne / carte selectionne (ouvre le panneau split via
 * `onSelect`).
 */
export function ProposalsTable({
  items,
  recipientSummaries,
  onSelect,
  selectedId,
  onEdit,
}: {
  items: ProposalRow[]
  recipientSummaries?: Map<string, RecipientSummary>
  onSelect: (id: Id<'proposals'>) => void
  selectedId?: Id<'proposals'> | null
  onEdit: (proposal: Doc<'proposals'>) => void
}) {
  const columns = useMemo(
    () => buildProposalColumns({ onOpen: onSelect, onEdit, recipientSummaries }),
    [onSelect, onEdit, recipientSummaries],
  )

  return (
    <>
      {/* Vue cartes : mobile (< md). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
        {items.map((proposal) => (
          <ProposalCard
            key={proposal._id}
            proposal={proposal}
            recipientSummary={recipientSummaries?.get(proposal._id)}
            onSelect={() => onSelect(proposal._id)}
            onEdit={onEdit}
          />
        ))}
      </div>

      {/* Vue tableau dense : >= md. */}
      <div className="hidden md:block">
        <DataTable
          data={items}
          columns={columns}
          defaultSorting={[{ id: 'title', desc: false }]}
          onRowClick={(row) => onSelect(row._id)}
          getRowId={(row) => row._id}
          selectedRowId={selectedId ?? undefined}
          minWidthClassName="min-w-[720px]"
          ariaLabel={m.prop_table_aria()}
        />
      </div>
    </>
  )
}
