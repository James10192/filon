import { useMemo } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { DataTable } from '~/components/data-table'
import { OpportunityCard } from './opportunity-card'
import { buildOpportunityColumns } from './opportunity-columns'
import { useLensSet } from './use-stage-labels'
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
  narrow = false,
}: {
  items: Opportunity[]
  onSelect: (id: Id<'opportunities'>) => void
  selectedId?: Id<'opportunities'> | null
  /** Panneau de détail ouvert : tableau compact, sans min-width forcée. */
  narrow?: boolean
}) {
  const lensSet = useLensSet()
  const columns = useMemo(
    () => buildOpportunityColumns({ onOpen: onSelect, narrow, set: lensSet }),
    [onSelect, narrow, lensSet],
  )

  return (
    <>
      {/* Cartes : toujours en mobile, et aussi en desktop quand le panneau
          détail est ouvert (zone étroite). Évite un tableau dense écrasé qui
          déborde horizontalement et décale la ligne sélectionnée. */}
      <div
        className={cn(
          'grid grid-cols-1 gap-3',
          narrow ? '' : 'sm:grid-cols-2 md:hidden',
        )}
      >
        {items.map((opportunity) => (
          <OpportunityCard
            key={opportunity._id}
            opportunity={opportunity}
            onSelect={() => onSelect(opportunity._id)}
          />
        ))}
      </div>

      {/* Tableau dense : desktop large uniquement (jamais en mode étroit). */}
      {!narrow && (
        <div className="hidden md:block">
          <DataTable
            data={items}
            columns={columns}
            defaultSorting={[{ id: 'title', desc: false }]}
            onRowClick={(row) => onSelect(row._id)}
            getRowId={(row) => row._id}
            selectedRowId={selectedId ?? undefined}
            ariaLabel={m.opp_table_aria()}
          />
        </div>
      )}
    </>
  )
}
