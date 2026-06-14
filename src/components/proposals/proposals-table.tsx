import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Doc } from '../../../convex/_generated/dataModel'
import { DataTable } from '~/components/data-table'
import { ProposalCard } from './proposal-card'
import { buildProposalColumns } from './proposal-columns'

type ProposalRow = Doc<'proposals'> & { companyName?: string }

/**
 * Tableau dense des propositions sur TanStack Table. < md : bascule en cartes
 * (la carte porte les actions de statut riches, mieux adaptees au tactile).
 */
export function ProposalsTable({
  items,
  onEdit,
}: {
  items: ProposalRow[]
  onEdit: (proposal: Doc<'proposals'>) => void
}) {
  const navigate = useNavigate()
  const columns = useMemo(() => buildProposalColumns({ onEdit }), [onEdit])

  return (
    <>
      {/* Vue cartes : mobile (< md). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
        {items.map((proposal) => (
          <ProposalCard key={proposal._id} proposal={proposal} onEdit={onEdit} />
        ))}
      </div>

      {/* Vue tableau dense : >= md. */}
      <div className="hidden md:block">
        <DataTable
          data={items}
          columns={columns}
          defaultSorting={[{ id: 'title', desc: false }]}
          onRowClick={(row) =>
            navigate({ to: '/app/propositions/$id', params: { id: row._id } })
          }
          getRowId={(row) => row._id}
          minWidthClassName="min-w-[720px]"
          ariaLabel="Tableau des propositions"
        />
      </div>
    </>
  )
}
