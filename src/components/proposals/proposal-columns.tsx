import type { ColumnDef } from '@tanstack/react-table'
import { Building2, Users } from 'lucide-react'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Badge } from '~/components/ui/badge'
import { SortableHeader } from '~/components/data-table'
import { ProposalRowActions } from './proposal-row-actions'
import {
  formatAmount,
  formatDate,
  STATUS_BADGE,
  STATUS_LABELS,
  type ProposalStatus,
} from './proposal-status'
import {
  normalizeProposalKind,
  proposalKindBadge,
  proposalKindLabel,
} from './proposal-kind'
import {
  recipientSummaryLabel,
  type RecipientSummary,
} from './recipient-status'

type Proposal = Doc<'proposals'> & { companyName?: string }

const STATUS_RANK: Record<ProposalStatus, number> = {
  draft: 0,
  sent: 1,
  accepted: 2,
  refused: 3,
}

/**
 * Definitions de colonnes du tableau des propositions. Fabrique parametree par
 * le callback d'edition (ouvre le dialog du formulaire cote page).
 */
export function buildProposalColumns({
  onOpen,
  onEdit,
  recipientSummaries,
}: {
  onOpen: (id: Id<'proposals'>) => void
  onEdit: (proposal: Doc<'proposals'>) => void
  recipientSummaries?: Map<string, RecipientSummary>
}): ColumnDef<Proposal, unknown>[] {
  return [
    {
      id: 'title',
      accessorKey: 'title',
      header: ({ column }) => <SortableHeader column={column} label={m.prop_col_proposal()} />,
      sortingFn: (a, b) =>
        a.original.title.localeCompare(b.original.title, 'fr', {
          sensitivity: 'base',
        }),
      meta: { headerClassName: 'w-[42%]' },
      cell: ({ row }) => {
        const p = row.original
        const summary = recipientSummaries?.get(p._id)
        const recipientLabel = summary ? recipientSummaryLabel(summary) : null
        const kind = normalizeProposalKind(p.kind)
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-fg">{p.title}</span>
              <Badge variant={proposalKindBadge(kind)}>{proposalKindLabel(kind)}</Badge>
            </div>
            <span className="flex items-center gap-1.5 truncate text-xs text-fg-subtle">
              {recipientLabel ? (
                <>
                  <Users className="size-3 shrink-0" />
                  <span className="truncate">{recipientLabel}</span>
                </>
              ) : p.companyName ? (
                <>
                  <Building2 className="size-3 shrink-0" />
                  <span className="truncate">{p.companyName}</span>
                </>
              ) : (
                m.prop_no_target_company()
              )}
            </span>
          </div>
        )
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <SortableHeader column={column} label={m.prop_col_status()} />,
      sortingFn: (a, b) =>
        STATUS_RANK[a.original.status as ProposalStatus] -
        STATUS_RANK[b.original.status as ProposalStatus],
      cell: ({ row }) => {
        const status = row.original.status as ProposalStatus
        return <Badge variant={STATUS_BADGE[status]}>{STATUS_LABELS[status]}</Badge>
      },
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: ({ column }) => <SortableHeader column={column} label={m.prop_col_amount()} />,
      sortingFn: (a, b) => (a.original.amount ?? -1) - (b.original.amount ?? -1),
      meta: {
        headerClassName: 'hidden lg:table-cell',
        cellClassName: 'hidden lg:table-cell',
      },
      cell: ({ row }) => {
        const amount = formatAmount(row.original.amount, row.original.currency)
        return amount ? (
          <span className="assay text-sm text-fg-muted">{amount}</span>
        ) : (
          <span className="text-fg-subtle">·</span>
        )
      },
    },
    {
      id: 'sentAt',
      accessorKey: 'sentAt',
      header: ({ column }) => <SortableHeader column={column} label={m.prop_col_sent_at()} />,
      sortingFn: (a, b) => {
        const av = a.original.sentAt
          ? new Date(a.original.sentAt).getTime()
          : Infinity
        const bv = b.original.sentAt
          ? new Date(b.original.sentAt).getTime()
          : Infinity
        return av - bv
      },
      meta: {
        headerClassName: 'hidden md:table-cell',
        cellClassName: 'hidden md:table-cell',
      },
      cell: ({ row }) => {
        const sentAt = formatDate(row.original.sentAt)
        return sentAt ? (
          <span className="assay text-sm text-fg-muted">{sentAt}</span>
        ) : (
          <span className="text-fg-subtle">·</span>
        )
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <span className="sr-only">{m.prop_col_actions()}</span>,
      meta: { headerClassName: 'w-12', cellClassName: 'w-12' },
      cell: ({ row }) => (
        <ProposalRowActions
          proposal={row.original}
          onOpen={() => onOpen(row.original._id)}
          onEdit={onEdit}
        />
      ),
    },
  ]
}
