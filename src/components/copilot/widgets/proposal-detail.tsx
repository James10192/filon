import { BellRing, Building2, Send } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { formatAmount, STATUS_BADGE, STATUS_LABELS } from '~/components/proposals/proposal-status'
import { Card, EmptyHint, Header } from './primitives'

type RecipientStatus = 'pending' | 'sent' | 'accepted' | 'refused'

const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  pending: 'À cibler',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
}

export type ProposalDetailData = {
  id: string
  title: string
  status: keyof typeof STATUS_LABELS
  amount: number | null
  currency: string
  companyName: string | null
  recipients: Array<{
    id: string
    targetName: string | null
    status: RecipientStatus
    opportunityTitle: string | null
  }>
  followups: Array<{
    id: string
    label: string
    dueDate: string
    done: boolean
  }>
}

export function ProposalDetail({ proposal }: { proposal: ProposalDetailData }) {
  return (
    <Card>
      <Header icon={Send} label="Détail de la proposition" />
      <div className="space-y-4 px-3.5 py-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">
              {proposal.title}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
              <Building2 className="size-3.5" />
              <span>{proposal.companyName ?? 'Aucune entreprise liée'}</span>
            </div>
          </div>
          {proposal.amount !== null && (
            <span className="shrink-0 text-xs text-fg-muted">
              {formatAmount(proposal.amount, proposal.currency)}
            </span>
          )}
          <Badge variant={STATUS_BADGE[proposal.status] ?? 'outline'}>
            {STATUS_LABELS[proposal.status] ?? proposal.status}
          </Badge>
        </div>

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">
            Destinataires
          </p>
          {proposal.recipients.length === 0 ? (
            <EmptyHint text="Aucun destinataire lié." />
          ) : (
            <ul className="space-y-2">
              {proposal.recipients.slice(0, 4).map((recipient) => (
                <li
                  key={recipient.id}
                  className="flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">
                      {recipient.targetName ?? 'Destinataire non résolu'}
                    </p>
                    {recipient.opportunityTitle && (
                      <p className="text-xs text-fg-muted">
                        Opportunité liée : {recipient.opportunityTitle}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {RECIPIENT_STATUS_LABELS[recipient.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">
            <BellRing className="size-3.5" />
            <span>Relances</span>
          </div>
          {proposal.followups.length === 0 ? (
            <EmptyHint text="Aucune relance liée." />
          ) : (
            <ul className="space-y-2">
              {proposal.followups.slice(0, 4).map((followup) => (
                <li
                  key={followup.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">{followup.label}</p>
                    <p className="text-xs text-fg-muted">{followup.dueDate}</p>
                  </div>
                  <Badge variant={followup.done ? 'info' : 'outline'}>
                    {followup.done ? 'Faite' : 'À faire'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Card>
  )
}
