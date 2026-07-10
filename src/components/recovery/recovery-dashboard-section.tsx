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
  SlidersHorizontal,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
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

  if (items === undefined) return <RecoveryLoadingState />

  return (
    <section className="flex flex-col gap-4" aria-labelledby="recovery-heading">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
              <ReceiptText className="size-4" />
            </span>
            <h2 id="recovery-heading" className="text-base font-semibold text-fg">
              Encaissements
            </h2>
            <Badge variant="outline" className="assay">
              {items.length}
            </Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-fg-muted">
            Factures, paiements et preuves liés aux opportunités gagnées.
          </p>
        </div>

        <MobileFilter value={filter} onChange={setFilter} />
      </header>

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as FilterKey)}
        className="hidden min-w-0 md:block"
      >
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          {FILTERS.map((item) => (
            <TabsTrigger
              key={item.key}
              value={item.key}
              className="h-9 shrink-0 px-3"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <RecoveryResults items={items} filtered={filtered} />
    </section>
  )
}

function MobileFilter({
  value,
  onChange,
}: {
  value: FilterKey
  onChange: (value: FilterKey) => void
}) {
  return (
    <div className="flex items-center gap-2 md:hidden">
      <SlidersHorizontal className="size-4 text-fg-subtle" aria-hidden="true" />
      <Select value={value} onValueChange={(next) => onChange(next as FilterKey)}>
        <SelectTrigger className="w-full sm:w-52" aria-label="Filtrer les encaissements">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTERS.map((item) => (
            <SelectItem key={item.key} value={item.key}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function RecoveryResults({
  items,
  filtered,
}: {
  items: RecoveryCase[]
  filtered: RecoveryCase[]
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed bg-surface px-5 py-8 text-center">
        <ReceiptText className="mx-auto size-5 text-fg-subtle" />
        <p className="mt-3 text-sm font-medium text-fg">Aucun encaissement à suivre</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-fg-muted">
          Une opportunité gagnée ouvre ici son suivi de facture, de paiement et de preuve.
        </p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed bg-surface px-4 py-6 text-center text-sm text-fg-muted">
        Aucun dossier ne correspond à ce filtre.
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {filtered.map((item) => (
        <RecoveryCaseCard key={item._id} item={item} />
      ))}
    </div>
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
    <article className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <Link
            to="/app/opportunites"
            search={{ view: 'liste', id: item.opportunityId }}
            className="block truncate text-sm font-semibold text-fg hover:text-accent hover:underline"
          >
            {item.opportunityTitle}
          </Link>
          <p className="mt-1 text-sm text-fg-muted">{item.clientName}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(item.status)}>
              {STATUS_LABELS[item.status]}
            </Badge>
            {hasMissingProof && (
              <Badge variant="warning">
                <AlertTriangle className="size-3" />
                Preuve requise
              </Badge>
            )}
            {item.persona && <Badge variant="outline">{personaLabel(item.persona)}</Badge>}
          </div>
        </div>

        <RecoveryActions
          item={item}
          busy={busy}
          onConfirmPayment={onConfirmPayment}
          onDispute={onDispute}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border border-t border-border pt-3">
        <Metric label="Attendu" value={formatExportAmount(item.amountExpected ?? 0, item.currency)} />
        <Metric label="Payé" value={formatExportAmount(item.amountPaid ?? 0, item.currency)} />
        <Metric
          label="Solde"
          value={formatExportAmount(Math.max(item.balance, 0), item.currency)}
          tone={item.balance > 0 ? 'warning' : 'success'}
        />
      </div>
    </article>
  )
}

function RecoveryActions({
  item,
  busy,
  onConfirmPayment,
  onDispute,
}: {
  item: RecoveryCase
  busy: 'pay' | 'dispute' | null
  onConfirmPayment: () => Promise<void>
  onDispute: () => Promise<void>
}) {
  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      <Button type="button" variant="outline" asChild className="flex-1 sm:h-9 sm:flex-none">
        <Link to="/app/opportunites" search={{ view: 'liste', id: item.opportunityId }}>
          <FilePlus2 className="size-4" />
          Facture
        </Link>
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => void onConfirmPayment()}
        disabled={busy !== null}
        className="flex-1 sm:h-9 sm:flex-none"
      >
        {busy === 'pay' ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        Payé
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => void onDispute()}
        disabled={busy !== null}
        className={cn(
          'flex-1 sm:h-9 sm:flex-none',
          item.status === 'dispute' && 'border-danger text-danger',
        )}
      >
        {busy === 'dispute' ? <Loader2 className="size-4 animate-spin" /> : <PauseCircle className="size-4" />}
        Suspendre
      </Button>
    </div>
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
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="text-xs text-fg-muted">{label}</p>
      <p
        className={cn(
          'assay mt-1 truncate text-xs font-semibold text-fg sm:text-sm',
          tone === 'warning' && 'text-warning',
          tone === 'success' && 'text-success',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function RecoveryLoadingState() {
  return (
    <section className="flex flex-col gap-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-11 rounded-[var(--radius)]" />
      <Skeleton className="h-36 rounded-[var(--radius-lg)]" />
    </section>
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
