import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { Plus, Send } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  DataTableToolbar,
  DataTableSkeleton,
  DataTableEmpty,
  type FilterChip,
} from '~/components/data-table'
import { ExportButton } from '~/components/billing/export-button'
import { PROPOSAL_COLUMNS } from '~/lib/export'
import { ProposalsTable } from '../proposals-table'
import {
  PROPOSAL_STATUSES,
  STATUS_LABELS,
  type ProposalStatus,
} from '../proposal-status'
import { useRecipientSummaries } from '../use-recipient-summaries'

type ProposalRow = Doc<'proposals'> & { companyName?: string }
type StatusFilter = 'all' | ProposalStatus

export type ListFilters = {
  status: StatusFilter
  search: string
}

export const EMPTY_FILTERS: ListFilters = {
  status: 'all',
  search: '',
}

/**
 * Vue Liste : barre de filtres (recherche + statut + puces actives) au-dessus
 * d'un tableau dense. La sélection ouvre le panneau split (via `onSelect`).
 * L'état des filtres est piloté par le parent pour rester stable au switch de
 * vue.
 */
export function ListView({
  filters,
  onFiltersChange,
  onSelect,
  selectedId,
  onCreate,
  onEdit,
}: {
  filters: ListFilters
  onFiltersChange: (next: ListFilters) => void
  onSelect: (id: Id<'proposals'>) => void
  selectedId?: Id<'proposals'> | null
  onCreate: () => void
  onEdit: (proposal: Doc<'proposals'>) => void
}) {
  const { status, search } = filters
  const proposals = useQuery(api.proposals.list, {}) as
    | ProposalRow[]
    | undefined
  const recipientSummaries = useRecipientSummaries()

  const filtered = useMemo(() => {
    if (!proposals) return undefined
    const q = search.trim().toLowerCase()
    return proposals.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (q) {
        const haystack =
          `${p.title} ${p.companyName ?? ''} ${p.pitch}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [proposals, status, search])

  const chips = useMemo<FilterChip[]>(() => {
    const out: FilterChip[] = []
    if (status !== 'all') {
      out.push({
        key: 'status',
        label: `Statut : ${STATUS_LABELS[status]}`,
        onRemove: () => onFiltersChange({ ...filters, status: 'all' }),
      })
    }
    const s = search.trim()
    if (s) {
      out.push({
        key: 'search',
        label: `« ${s} »`,
        onRemove: () => onFiltersChange({ ...filters, search: '' }),
      })
    }
    return out
  }, [status, search, filters, onFiltersChange])

  const hasActiveFilters = chips.length > 0
  const reset = () => onFiltersChange(EMPTY_FILTERS)

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        search={search}
        onSearchChange={(v) => onFiltersChange({ ...filters, search: v })}
        searchPlaceholder="Rechercher une proposition..."
        searchLabel="Rechercher une proposition"
        chips={chips}
        onClearAll={reset}
        actions={
          <ExportButton
            base="propositions"
            rows={filtered ?? []}
            columns={PROPOSAL_COLUMNS}
          />
        }
      >
        <Select
          value={status}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, status: v as StatusFilter })
          }
        >
          <SelectTrigger className="lg:w-44" aria-label="Filtrer par statut">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {PROPOSAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DataTableToolbar>

      {proposals === undefined || filtered === undefined ? (
        <DataTableSkeleton />
      ) : filtered.length === 0 ? (
        hasActiveFilters ? (
          <DataTableEmpty
            icon={Send}
            title="Aucun résultat"
            message="Aucune proposition ne correspond à ces filtres."
            action={
              <Button variant="outline" onClick={reset}>
                Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <DataTableEmpty
            icon={Send}
            title="Aucune proposition pour l'instant"
            message="Démarchez les bonnes entreprises sans rien laisser filer. Créez votre première proposition spontanée pour la suivre jusqu'à la signature."
            action={
              <Button onClick={onCreate}>
                <Plus className="size-4" />
                Nouvelle proposition
              </Button>
            }
          />
        )
      ) : (
        <ProposalsTable
          items={filtered}
          recipientSummaries={recipientSummaries}
          onSelect={onSelect}
          selectedId={selectedId}
          onEdit={onEdit}
        />
      )}
    </div>
  )
}
