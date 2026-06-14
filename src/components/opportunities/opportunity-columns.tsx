import type { ColumnDef } from '@tanstack/react-table'
import { Coins, MapPin } from 'lucide-react'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { SortableHeader } from '~/components/data-table'
import { StageChipSelect } from './stage-chip-select'
import { TypeChip, PriorityChip, DueBadge } from './chips'
import { OpportunityRowActions } from './opportunity-row-actions'
import { STAGES, formatDateShort, type Priority, type Stage } from './meta'

type Opportunity = Doc<'opportunities'>

/** Ordres canoniques de tri (etape = pipeline, priorite = low<med<high). */
const STAGE_RANK: Record<Stage, number> = Object.fromEntries(
  STAGES.map((s, i) => [s, i]),
) as Record<Stage, number>
const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2 }

/**
 * Definitions de colonnes du tableau des opportunites. Fabrique parametree par
 * la table id -> nom d'entreprise (la liste ne joint pas le nom) et un callback
 * d'ouverture du detail (clavier / menu d'actions).
 */
export function buildOpportunityColumns({
  companyNames,
  onOpen,
}: {
  companyNames: Map<string, string>
  onOpen: (id: Id<'opportunities'>) => void
}): ColumnDef<Opportunity, unknown>[] {
  return [
    {
      id: 'title',
      accessorKey: 'title',
      header: ({ column }) => <SortableHeader column={column} label="Opportunité" />,
      sortingFn: (a, b) =>
        a.original.title.localeCompare(b.original.title, 'fr', {
          sensitivity: 'base',
        }),
      meta: { headerClassName: 'w-[40%]' },
      cell: ({ row }) => {
        const o = row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-fg">{o.title}</span>
              <TypeChip
                type={o.type}
                className="hidden shrink-0 xl:inline-flex"
              />
            </span>
            <span className="truncate text-xs text-fg-subtle">
              {companyNames.get(o.companyId ?? '') ?? 'Sans entreprise'}
            </span>
          </div>
        )
      },
    },
    {
      id: 'stage',
      accessorKey: 'stage',
      header: ({ column }) => <SortableHeader column={column} label="Étape" />,
      sortingFn: (a, b) => STAGE_RANK[a.original.stage] - STAGE_RANK[b.original.stage],
      cell: ({ row }) => (
        <StageChipSelect id={row.original._id} stage={row.original.stage} compact />
      ),
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: ({ column }) => <SortableHeader column={column} label="Priorité" />,
      sortingFn: (a, b) =>
        PRIORITY_RANK[a.original.priority] - PRIORITY_RANK[b.original.priority],
      meta: { headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell' },
      cell: ({ row }) => <PriorityChip priority={row.original.priority} />,
    },
    {
      id: 'deadline',
      accessorKey: 'deadline',
      header: ({ column }) => <SortableHeader column={column} label="Échéance" />,
      sortingFn: (a, b) => {
        // Sans echeance -> rejete en fin de tri ascendant.
        const av = a.original.deadline
          ? new Date(a.original.deadline).getTime()
          : Infinity
        const bv = b.original.deadline
          ? new Date(b.original.deadline).getTime()
          : Infinity
        return av - bv
      },
      meta: { cellClassName: 'text-fg-muted' },
      cell: ({ row }) =>
        row.original.deadline ? (
          <span className="assay text-sm">
            {formatDateShort(row.original.deadline)}
          </span>
        ) : (
          <span className="text-fg-subtle">·</span>
        ),
    },
    {
      id: 'tracking',
      enableSorting: false,
      header: () => <span className="eyebrow">Suivi</span>,
      cell: ({ row }) => {
        const o = row.original
        return (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            {o.compensation && (
              <span className="assay inline-flex items-center gap-1">
                <Coins className="size-3.5 text-fg-subtle" />
                {o.compensation}
              </span>
            )}
            {o.location && (
              <span className="inline-flex items-center gap-1 text-fg-subtle">
                <MapPin className="size-3.5" />
                {o.location}
              </span>
            )}
            {o.nextActionAt && <DueBadge date={o.nextActionAt} />}
          </div>
        )
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      meta: { headerClassName: 'w-12', cellClassName: 'w-12' },
      cell: ({ row }) => (
        <OpportunityRowActions
          opportunity={row.original}
          onOpen={() => onOpen(row.original._id)}
        />
      ),
    },
  ]
}
