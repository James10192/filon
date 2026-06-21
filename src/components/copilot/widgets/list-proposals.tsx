import { Send } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Badge } from '~/components/ui/badge'
import {
  STATUS_LABELS,
  STATUS_BADGE,
  formatAmount,
} from '~/components/proposals/proposal-status'
import { List } from './primitives'

/** Widget « liste de propositions » : titre + montant + badge de statut. */

export type ProposalItem = {
  id: string
  title: string
  status: keyof typeof STATUS_LABELS
  amount: number | null
  currency: string
}

export function ListProposals({ items }: { items: ProposalItem[] }) {
  return (
    <List
      items={items}
      icon={Send}
      count={(n) =>
        n > 1
          ? m.app_tool_proposals_plural({ n })
          : m.app_tool_proposals_singular({ n })
      }
      empty={m.app_tool_no_proposals()}
      row={(p) => (
        <>
          <span className="min-w-0 flex-1 truncate text-sm text-fg">
            {p.title}
          </span>
          {p.amount != null && (
            <span className="assay shrink-0 text-xs text-fg-muted">
              {formatAmount(p.amount, p.currency)}
            </span>
          )}
          <Badge variant={STATUS_BADGE[p.status] ?? 'outline'}>
            {STATUS_LABELS[p.status] ?? p.status}
          </Badge>
        </>
      )}
    />
  )
}
