import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  Loader2,
  PauseCircle,
  ReceiptText,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import { cn } from '~/lib/utils'
import { formatExportAmount } from '~/lib/export/export-formatters'

type RecoveryCase = FunctionReturnType<typeof api.recoveryCases.listDashboard>[number]
type FilterKey =
  | 'all'
  | 'to_invoice'
  | 'waiting_payment'
  | 'mailpulse_active'
  | 'paid_to_confirm'
  | 'proof_missing'
  | 'dispute'

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'to_invoice', label: 'À facturer' },
  { key: 'waiting_payment', label: 'En attente paiement' },
  { key: 'mailpulse_active', label: 'MailPulse actif' },
  { key: 'paid_to_confirm', label: 'Payé à confirmer' },
  { key: 'proof_missing', label: 'Preuve manquante' },
  { key: 'dispute', label: 'Litige' },
]

const STATUS_LABELS: Record<RecoveryCase['status'], string> = {
  to_invoice: 'À facturer',
  invoice_ready: 'Facture prête',
  invoice_sent: 'Facture envoyée',
  waiting_payment: 'En attente paiement',
  mailpulse_active: 'MailPulse actif',
  payment_promised: 'Paiement promis',
  partial_paid: 'Paiement partiel',
  paid_to_confirm: 'Payé à confirmer',
  paid_confirmed: 'Payé confirmé',
  proof_missing: 'Preuve manquante',
  dispute: 'Litige',
  cancelled: 'Annulé',
}

export function RecoveryDashboardSection() {
  const items = useQuery(api.recoveryCases.listDashboard, {})
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = useMemo(() => {
    if (!items || filter === 'all') return items ?? []
    return items.filter((item) => item.status === filter)
  }, [filter, items])

  if (items === undefined) {
    return (
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-28 rounded-[var(--radius)]" />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-accent" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
            Recouvrement
          </h2>
          <Badge variant="outline" className="tabular-nums">
            {items.length}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant={filter === item.key ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(item.key)}
              className="h-8"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed bg-surface p-5 text-sm text-fg-muted">
          Aucun dossier de recouvrement. Une opportunité gagnée ouvre le dossier
          avec facture, paiement, preuve et MailPulse.
        </div>
      ) : (
        <div className="grid gap-2.5">
          {filtered.map((item) => (
            <RecoveryCaseCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

function RecoveryCaseCard({ item }: { item: RecoveryCase }) {
  const confirmPayment = useMutation(api.recoveryCases.confirmPayment)
  const setStatus = useMutation(api.recoveryCases.setStatus)
  const [busy, setBusy] = useState<'pay' | 'dispute' | null>(null)
  const hasMissingProof = item.status === 'proof_missing' || item.proofCount === 0

  async function onConfirmPayment() {
    setBusy('pay')
    try {
      await confirmPayment({
        recoveryCaseId: item._id,
        ...(item.amountExpected ? { amountPaid: item.amountExpected } : {}),
      })
      toast.success('Paiement marqué comme reçu')
    } catch {
      toast.error("Le paiement n'a pas pu être confirmé.")
    } finally {
      setBusy(null)
    }
  }

  async function onDispute() {
    setBusy('dispute')
    try {
      await setStatus({ recoveryCaseId: item._id, status: 'dispute' })
      toast.success('Relances suspendues pour litige')
    } catch {
      toast.error("Le dossier n'a pas pu être suspendu.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="rounded-[var(--radius)] border bg-surface p-3.5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(item.status)}>
              {STATUS_LABELS[item.status]}
            </Badge>
            {hasMissingProof && (
              <Badge variant="warning">
                <AlertTriangle className="size-3" />
                Preuve
              </Badge>
            )}
            {item.persona && <Badge variant="outline">{personaLabel(item.persona)}</Badge>}
          </div>

          <Link
            to="/app/opportunites"
            search={{ view: 'liste', id: item.opportunityId }}
            className="mt-2 block truncate text-sm font-semibold text-fg hover:underline"
          >
            {item.opportunityTitle}
          </Link>
          <p className="mt-1 text-xs text-fg-muted">{item.clientName}</p>

          <div className="mt-3 grid gap-2 text-xs text-fg-muted sm:grid-cols-3">
            <Metric
              label="Attendu"
              value={formatExportAmount(item.amountExpected ?? 0, item.currency)}
            />
            <Metric
              label="Payé"
              value={formatExportAmount(item.amountPaid ?? 0, item.currency)}
            />
            <Metric
              label="Solde"
              value={formatExportAmount(Math.max(item.balance, 0), item.currency)}
              tone={item.balance > 0 ? 'warning' : 'success'}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link
              to="/app/opportunites"
              search={{ view: 'liste', id: item.opportunityId }}
            >
              <FilePlus2 className="size-4" />
              Facture
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void onConfirmPayment()}
            disabled={busy !== null}
          >
            {busy === 'pay' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Payé
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void onDispute()}
            disabled={busy !== null}
            className={cn(item.status === 'dispute' && 'border-danger text-danger')}
          >
            {busy === 'dispute' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PauseCircle className="size-4" />
            )}
            Suspendre
          </Button>
        </div>
      </div>
    </article>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'warning' | 'success'
}) {
  return (
    <div>
      <p>{label}</p>
      <p
        className={cn(
          'mt-0.5 font-semibold text-fg',
          tone === 'warning' && 'text-warning',
          tone === 'success' && 'text-success',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function statusVariant(status: RecoveryCase['status']) {
  if (status === 'paid_confirmed') return 'success'
  if (status === 'proof_missing' || status === 'partial_paid') return 'warning'
  if (status === 'dispute' || status === 'cancelled') return 'danger'
  if (status === 'mailpulse_active') return 'accent'
  return 'outline'
}

function personaLabel(persona: NonNullable<RecoveryCase['persona']>) {
  const labels: Record<typeof persona, string> = {
    relationnel: 'Relationnel',
    commercial: 'Commercial',
    freelance: 'Freelance',
    immobilier: 'Immobilier',
    assurance: 'Assurance',
    recrutement: 'Recrutement',
    emploi: 'Emploi',
    autre: 'Autre',
  }
  return labels[persona]
}
