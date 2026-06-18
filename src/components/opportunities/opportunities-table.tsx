import { useMemo } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import { DataTable } from '~/components/data-table'
import { OpportunityCard } from './opportunity-card'
import { buildOpportunityColumns } from './opportunity-columns'
import type { EnrichedOpportunity } from './types'

type Opportunity = EnrichedOpportunity

/**
 * Tableau dense des opportunites (style Linear / Attio) sur TanStack Table.
 *
 * - Tri par colonne (titre, etape, priorite, echeance) via les colonnes.
 * - En-tete collant, survol de ligne, navigation clavier (haut/bas + Entree).
 * - Clic ligne -> selection (ouvre le panneau split). < md : cartes domaine.
 */
export function OpportunitiesTable({
  items,
  onSelect,
  selectedId,
}: {
  items: Opportunity[]
  onSelect: (id: Id<'opportunities'>) => void
  selectedId?: Id<'opportunities'> | null
}) {
  const columns = useMemo(
    () => buildOpportunityColumns({ onOpen: onSelect }),
    [onSelect],
  )

  return (
    <>
      {/* Vue cartes : mobile (< md). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {items.map((opportunity) => (
          <OpportunityCard
            key={opportunity._id}
            opportunity={opportunity}
            onSelect={() => onSelect(opportunity._id)}
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
          ariaLabel="Tableau des opportunités"
        />
      </div>
    </>
  )
}
