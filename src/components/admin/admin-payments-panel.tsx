import { useCallback, useEffect, useState } from 'react'
import { useAction } from 'convex/react'
import { ConvexError } from 'convex/values'
import { CreditCard, RefreshCw, AlertTriangle } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import {
  formatDate,
  formatNumber,
  formatXof,
  paymentChannelLabel,
  paymentStatusMeta,
} from './admin-meta'

type PaystackTransaction = {
  id: number
  amount: number
  currency: string
  status: string
  reference: string
  channel: string | null
  paidAt: string | null
  email: string | null
}

/** Message d'erreur lisible depuis une erreur Convex (ou un échec réseau). */
function errorMessage(error: unknown): string {
  if (
    error instanceof ConvexError &&
    typeof error.data === 'object' &&
    error.data &&
    'message' in error.data
  ) {
    return String((error.data as { message: unknown }).message)
  }
  if (error instanceof Error && error.message) return error.message
  return 'Une erreur est survenue lors du chargement.'
}

/**
 * Section « Paiements » du back-office : transactions reçues via Paystack.
 * Une action Convex n'est PAS réactive : on charge une fois au montage et on
 * rafraîchit à la demande (bouton « Actualiser »).
 */
export function AdminPaymentsPanel() {
  const fetchTransactions = useAction(api.admin.paystackTransactions)
  const [rows, setRows] = useState<PaystackTransaction[] | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (withToast: boolean) => {
      setRefreshing(true)
      setError(undefined)
      try {
        const data = await fetchTransactions({})
        setRows(data)
        if (withToast) toast.success('Paiements actualisés.')
      } catch (e) {
        setError(errorMessage(e))
        setRows((prev) => prev ?? [])
        if (withToast) toast.error("Échec de l'actualisation.")
      } finally {
        setRefreshing(false)
      }
    },
    [fetchTransactions],
  )

  useEffect(() => {
    void load(false)
  }, [load])

  const loading = rows === undefined

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {loading
            ? 'Chargement des paiements.'
            : `${formatNumber(rows.length)} transaction${rows.length > 1 ? 's' : ''}, récentes d'abord.`}
        </p>
        <Button
          variant="outline"
          className="h-11"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`size-4${refreshing ? ' animate-spin' : ''}`}
            aria-hidden
          />
          Actualiser
        </Button>
      </div>

      {error && !loading && (rows?.length ?? 0) === 0 ? (
        <PaymentsError message={error} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
          {loading ? (
            <PaymentsTableSkeleton />
          ) : rows.length === 0 ? (
            <EmptyPayments />
          ) : (
            <PaymentsTable rows={rows} />
          )}
        </div>
      )}
    </section>
  )
}

function PaymentsTable({ rows }: { rows: PaystackTransaction[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-fg-muted">Montant</TableHead>
          <TableHead className="text-fg-muted">E-mail client</TableHead>
          <TableHead className="text-fg-muted">Référence</TableHead>
          <TableHead className="text-fg-muted">Canal</TableHead>
          <TableHead className="text-fg-muted">Statut</TableHead>
          <TableHead className="text-fg-muted">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => {
          const statusMeta = paymentStatusMeta(t.status)
          return (
            <TableRow key={t.id} className="border-border">
              <TableCell className="whitespace-nowrap font-medium text-fg">
                {t.currency === 'XOF'
                  ? formatXof(t.amount)
                  : `${formatNumber(t.amount)} ${t.currency}`}
              </TableCell>
              <TableCell className="text-sm text-fg-muted">
                {t.email ?? '—'}
              </TableCell>
              <TableCell className="font-mono text-xs text-fg-subtle">
                {t.reference}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{paymentChannelLabel(t.channel)}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-fg-muted">
                {t.paidAt ? formatDate(Date.parse(t.paidAt)) : '—'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function EmptyPayments() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-subtle">
        <CreditCard className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">
        Aucun paiement reçu pour le moment
      </p>
      <p className="max-w-xs text-sm text-fg-muted">
        Les transactions encaissées via Paystack apparaîtront ici.
      </p>
    </div>
  )
}

function PaymentsError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-danger-soft text-danger">
        <AlertTriangle className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">Chargement impossible</p>
      <p className="max-w-xs text-sm text-fg-muted">{message}</p>
    </div>
  )
}

function PaymentsTableSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="hidden h-3 w-48 sm:block" />
          <Skeleton className="hidden h-3 w-32 md:block" />
          <Skeleton className="ml-auto h-6 w-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-6 w-16 rounded-[var(--radius-sm)]" />
        </div>
      ))}
    </div>
  )
}
