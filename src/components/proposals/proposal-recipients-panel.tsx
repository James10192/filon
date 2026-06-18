import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Building2, Coins, User } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { toast } from '~/components/ui/sonner'
import { STAGE_META } from '~/components/opportunities/meta'
import { DetailPanel } from './detail-panel'
import { formatAmount } from './proposal-status'
import {
  RECIPIENT_STATUSES,
  RECIPIENT_STATUS_BADGE,
  RECIPIENT_STATUS_HINT,
  RECIPIENT_STATUS_LABELS,
  recipientSummaryLabel,
  summarizeRecipients,
  type RecipientStatus,
} from './recipient-status'

type Recipient = Doc<'proposalRecipients'> & { targetName?: string }
type OpportunityRow = Doc<'opportunities'>

/**
 * Pipeline de la proposition : la LISTE des destinataires (entreprises et
 * particuliers) avec leur statut individuel, modifiable en place. Montre le
 * montant par destinataire si present et l'opportunite sur laquelle l'envoi a
 * abouti (lien vers le pipeline). C'est la lecture multi-cible du detail : une
 * offre, plusieurs cibles suivies separement.
 *
 * `currency` est la devise de la proposition, repli pour les montants par
 * destinataire qui n'en portent pas.
 */
export function ProposalRecipientsPanel({
  recipients,
  currency,
}: {
  recipients: Recipient[]
  currency: string | undefined
}) {
  const updateStatus = useMutation(api.proposalRecipients.updateRecipientStatus)
  const [busyId, setBusyId] = useState<Id<'proposalRecipients'> | null>(null)

  // Resolution des opportunites liees (« sur quoi ca a abouti »). Une seule
  // requete, mappee par id ; ne charge que si au moins un destinataire est lie.
  const hasLinks = recipients.some((r) => r.opportunityId)
  const opportunities = useQuery(
    api.opportunities.list,
    hasLinks ? {} : 'skip',
  ) as OpportunityRow[] | undefined
  const oppById = useMemo(() => {
    const map = new Map<string, OpportunityRow>()
    for (const o of opportunities ?? []) map.set(o._id, o)
    return map
  }, [opportunities])

  const summary = summarizeRecipients(recipients)
  const summaryLabel = recipientSummaryLabel(summary)

  async function changeStatus(
    id: Id<'proposalRecipients'>,
    status: RecipientStatus,
  ) {
    if (busyId) return
    setBusyId(id)
    try {
      await updateStatus({ id, status })
      toast.success(
        `Destinataire marqué « ${RECIPIENT_STATUS_LABELS[status].toLowerCase()} ».`,
      )
    } catch {
      toast.error("Le statut n'a pas pu être changé.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DetailPanel
      title="Destinataires"
      action={
        summaryLabel ? (
          <span className="text-xs font-medium text-fg-muted">
            {summaryLabel}
          </span>
        ) : undefined
      }
    >
      {recipients.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Aucun destinataire pour l'instant. Ouvrez « Modifier » pour adresser
          cette offre à des entreprises ou des particuliers.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {recipients.map((r) => {
            const status = r.status as RecipientStatus
            const Icon = r.targetType === 'company' ? Building2 : User
            const name =
              r.targetName ??
              (r.targetType === 'company' ? 'Entreprise' : 'Particulier')
            const amount = formatAmount(r.amount, currency)
            const linked = r.opportunityId
              ? oppById.get(r.opportunityId)
              : undefined

            return (
              <li
                key={r._id}
                className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Icon className="size-4 shrink-0 text-fg-subtle" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                    {name}
                  </span>
                  <Badge variant={RECIPIENT_STATUS_BADGE[status]}>
                    {RECIPIENT_STATUS_LABELS[status]}
                  </Badge>
                  <Select
                    value={status}
                    disabled={busyId === r._id}
                    onValueChange={(v) =>
                      changeStatus(r._id, v as RecipientStatus)
                    }
                  >
                    <SelectTrigger
                      className="h-8 w-32"
                      aria-label={`Statut de ${name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPIENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {RECIPIENT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-fg-subtle">
                  {RECIPIENT_STATUS_HINT[status]}
                </p>

                {(amount || r.note || linked) && (
                  <div className="flex flex-col gap-1.5 border-t border-border pt-2 text-xs">
                    {amount && (
                      <span className="inline-flex items-center gap-1.5 text-fg-muted">
                        <Coins className="size-3.5 text-fg-subtle" />
                        <span className="assay font-medium">{amount}</span>
                      </span>
                    )}
                    {r.note && (
                      <p className="whitespace-pre-wrap break-words text-fg-muted">
                        {r.note}
                      </p>
                    )}
                    {r.opportunityId &&
                      (linked ? (
                        <Link
                          to="/app/opportunites"
                          search={{ view: 'liste', id: r.opportunityId }}
                          className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                        >
                          <ArrowUpRight className="size-3.5 shrink-0" />
                          <span className="truncate">{linked.title}</span>
                          <span className="text-fg-subtle">
                            ·{' '}
                            {STAGE_META[linked.stage as keyof typeof STAGE_META]
                              ?.label ?? linked.stage}
                          </span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-fg-subtle">
                          <ArrowUpRight className="size-3.5 shrink-0" />
                          Opportunité liée
                        </span>
                      ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </DetailPanel>
  )
}
