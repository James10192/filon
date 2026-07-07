import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  CheckCircle2,
  Clock3,
  FilePlus2,
  Loader2,
  Mail,
  ReceiptText,
  ShieldAlert,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import { formatExportAmount } from '~/lib/export/export-formatters'
import { Panel } from '~/components/opportunities/detail/panel'

export function OpportunityRecoveryPanel({
  opportunityId,
  contactEmail,
  onGenerateDocument,
  onOpenMailPulse,
}: {
  opportunityId: Id<'opportunities'>
  contactEmail?: string
  onGenerateDocument: () => void
  onOpenMailPulse: () => void
}) {
  const recoveryCase = useQuery(api.recoveryCases.getForOpportunity, {
    opportunityId,
  })
  const createCase = useMutation(api.recoveryCases.createOrGet)
  const confirmPayment = useMutation(api.recoveryCases.confirmPayment)
  const [busy, setBusy] = useState<'create' | 'paid' | null>(null)

  async function ensureCase() {
    setBusy('create')
    try {
      await createCase({ opportunityId })
      toast.success('Dossier de recouvrement prêt')
    } catch {
      toast.error("Le dossier de recouvrement n'a pas pu être créé.")
    } finally {
      setBusy(null)
    }
  }

  async function markPaid() {
    if (!recoveryCase) return
    setBusy('paid')
    try {
      await confirmPayment({
        recoveryCaseId: recoveryCase._id,
        ...(recoveryCase.amountExpected
          ? { amountPaid: recoveryCase.amountExpected }
          : {}),
      })
      toast.success('Paiement marqué comme reçu')
    } catch {
      toast.error("Le paiement n'a pas pu être confirmé.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel
      title="Recouvrement"
      action={
        recoveryCase ? (
          <Badge variant={recoveryCase.status === 'paid_confirmed' ? 'success' : 'outline'}>
            {statusLabel(recoveryCase.status)}
          </Badge>
        ) : null
      }
    >
      {recoveryCase === undefined ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 rounded-[var(--radius)]" />
        </div>
      ) : recoveryCase === null ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted">
            Créez le dossier d'encaissement pour suivre facture, relance,
            paiement et preuve.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => void ensureCase()}
            disabled={busy !== null}
          >
            {busy === 'create' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ReceiptText className="size-4" />
            )}
            Créer le dossier
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 text-xs text-fg-muted">
            <div className="flex justify-between gap-3">
              <span>Montant attendu</span>
              <strong className="text-fg">
                {formatExportAmount(recoveryCase.amountExpected ?? 0, recoveryCase.currency)}
              </strong>
            </div>
            <div className="flex justify-between gap-3">
              <span>Solde</span>
              <strong className="text-fg">
                {formatExportAmount(Math.max(recoveryCase.balance, 0), recoveryCase.currency)}
              </strong>
            </div>
          </div>

          <div className="grid gap-2">
            <ChecklistItem
              done={recoveryCase.status !== 'to_invoice'}
              label="Facture ou proforma préparée"
            />
            <ChecklistItem done={Boolean(contactEmail)} label="Email client" />
            <ChecklistItem done={Boolean(recoveryCase.dueDate)} label="Échéance" />
            <ChecklistItem
              done={recoveryCase.status === 'mailpulse_active'}
              label="MailPulse"
            />
            <ChecklistItem done={recoveryCase.proofCount > 0} label="Preuve" />
          </div>

          {recoveryCase.status === 'proof_missing' && (
            <div className="flex items-start gap-2 rounded-[var(--radius)] border border-warning/30 bg-warning-soft p-3 text-xs text-warning">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              Paiement confirmé sans justificatif. Déposez une facture FNE, un
              reçu ou une preuve de virement dans Documents.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onGenerateDocument}>
              <FilePlus2 className="size-4" />
              Facture hors FNE
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenMailPulse}
              disabled={!contactEmail}
            >
              <Mail className="size-4" />
              MailPulse
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void markPaid()}
              disabled={busy !== null}
            >
              {busy === 'paid' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Paiement reçu
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="size-4 text-success" />
      ) : (
        <Clock3 className="size-4 text-fg-subtle" />
      )}
      <span className={done ? 'text-fg' : 'text-fg-muted'}>{label}</span>
    </div>
  )
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    to_invoice: 'À facturer',
    invoice_ready: 'Facture prête',
    invoice_sent: 'Facture envoyée',
    waiting_payment: 'En attente',
    mailpulse_active: 'MailPulse',
    payment_promised: 'Promesse',
    partial_paid: 'Partiel',
    paid_to_confirm: 'À confirmer',
    paid_confirmed: 'Payé',
    proof_missing: 'Preuve requise',
    dispute: 'Litige',
    cancelled: 'Annulé',
  }
  return labels[status] ?? status
}
