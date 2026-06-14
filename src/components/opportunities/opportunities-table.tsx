import { useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { DataTable } from '~/components/data-table'
import { OpportunityCard } from './opportunity-card'
import { buildOpportunityColumns } from './opportunity-columns'

type Opportunity = Doc<'opportunities'>

/**
 * Tableau dense des opportunites (style Linear / Attio) sur TanStack Table.
 *
 * - Tri par colonne (titre, etape, priorite, echeance) via les colonnes.
 * - En-tete collant, survol de ligne, navigation clavier (haut/bas + Entree).
 * - Clic ligne -> detail. < md : bascule en cartes specifiques au domaine.
 */
export function OpportunitiesTable({
  items,
  companyNames,
}: {
  items: Opportunity[]
  companyNames: Map<string, string>
}) {
  const navigate = useNavigate()

  const openDetail = useCallback(
    (id: Id<'opportunities'>) => {
      navigate({ to: '/app/opportunites/$id', params: { id } })
    },
    [navigate],
  )

  const columns = useMemo(
    () => buildOpportunityColumns({ companyNames, onOpen: openDetail }),
    [companyNames, openDetail],
  )

  return (
    <>
      {/* Vue cartes : mobile (< md). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {items.map((opportunity) => (
          <OpportunityCard key={opportunity._id} opportunity={opportunity} />
        ))}
      </div>

      {/* Vue tableau dense : >= md. */}
      <div className="hidden md:block">
        <DataTable
          data={items}
          columns={columns}
          defaultSorting={[{ id: 'title', desc: false }]}
          onRowClick={(row) => openDetail(row._id)}
          getRowId={(row) => row._id}
          ariaLabel="Tableau des opportunités"
        />
      </div>
    </>
  )
}
