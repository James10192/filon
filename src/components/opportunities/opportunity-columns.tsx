import type { ColumnDef } from '@tanstack/react-table'
import { Coins, MapPin, Radio } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { SortableHeader } from '~/components/data-table'
import { StageChipSelect } from './stage-chip-select'
import { PriorityChipSelect } from './priority-chip-select'
import {
  TypeChip,
  DueBadge,
  TargetChip,
  TagChips,
  sourceLabel,
} from './chips'
import { OpportunityRowActions } from './opportunity-row-actions'
import {
  STAGES,
  fieldLabel,
  formatDateShort,
  type Priority,
  type Stage,
  type StageLabelSet,
} from './meta'
import type { EnrichedOpportunity } from './types'

type Opportunity = EnrichedOpportunity

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
  onOpen,
  narrow = false,
  set = 'emploi',
}: {
  onOpen: (id: Id<'opportunities'>) => void
  /** Panneau de détail ouvert : zone étroite, on allège les colonnes. */
  narrow?: boolean
  /** Jeu d'etiquettes du persona (libelle de l'en-tete echeance). */
  set?: StageLabelSet
}): ColumnDef<Opportunity, unknown>[] {
  const columns: ColumnDef<Opportunity, unknown>[] = [
    {
      id: 'title',
      accessorKey: 'title',
      header: ({ column }) => <SortableHeader column={column} label={m.opp_col_opportunity()} />,
      sortingFn: (a, b) =>
        a.original.title.localeCompare(b.original.title, 'fr', {
          sensitivity: 'base',
        }),
      meta: { headerClassName: 'w-[40%]' },
      cell: ({ row }) => {
        const o = row.original
        const targetName = o.companyName ?? o.contactName
        return (
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-fg">{o.title}</span>
              <TypeChip
                type={o.type}
                className="hidden shrink-0 xl:inline-flex"
              />
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              {targetName ? (
                <TargetChip
                  targetType={o.effectiveTargetType}
                  name={targetName}
                />
              ) : (
                <span className="text-xs text-fg-subtle">{m.opp_no_target()}</span>
              )}
              <TagChips tags={o.tags} max={2} />
            </span>
          </div>
        )
      },
    },
    {
      id: 'stage',
      accessorKey: 'stage',
      header: ({ column }) => <SortableHeader column={column} label={m.opp_col_stage()} />,
      sortingFn: (a, b) => STAGE_RANK[a.original.stage] - STAGE_RANK[b.original.stage],
      cell: ({ row }) => (
        <StageChipSelect id={row.original._id} stage={row.original.stage} compact />
      ),
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: ({ column }) => <SortableHeader column={column} label={m.opp_col_priority()} />,
      sortingFn: (a, b) =>
        PRIORITY_RANK[a.original.priority] - PRIORITY_RANK[b.original.priority],
      meta: { headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell' },
      cell: ({ row }) => (
        <PriorityChipSelect
          id={row.original._id}
          priority={row.original.priority}
        />
      ),
    },
    {
      id: 'deadline',
      accessorKey: 'deadline',
      header: ({ column }) => <SortableHeader column={column} label={fieldLabel('deadline', set)} />,
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
      header: () => <span className="eyebrow">{m.opp_col_tracking()}</span>,
      cell: ({ row }) => {
        const o = row.original
        const source = sourceLabel(o.sourceChannel, o.sourceDetail, o.source)
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
            {source && (
              <span
                className="inline-flex max-w-[14rem] items-center gap-1 text-fg-subtle"
                title={source}
              >
                <Radio className="size-3.5 shrink-0" />
                <span className="truncate">{source}</span>
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
      header: () => <span className="sr-only">{m.opp_col_actions()}</span>,
      meta: { headerClassName: 'w-12', cellClassName: 'w-12' },
      cell: ({ row }) => (
        <OpportunityRowActions
          opportunity={row.original}
          onOpen={() => onOpen(row.original._id)}
        />
      ),
    },
  ]

  // Panneau de détail ouvert : la zone liste rétrécit. On retire la colonne
  // « suivi » (la plus large) pour que le tableau tienne sans débordement
  // horizontal (sinon décalage / scroll-x au clic d'une ligne).
  return narrow ? columns.filter((c) => c.id !== 'tracking') : columns
}
