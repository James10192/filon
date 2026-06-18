import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAction } from 'convex/react'
import { ConvexError } from 'convex/values'
import {
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Wallet,
  CheckCircle2,
} from 'lucide-react'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '~/components/ui/sheet'
import { useMediaQuery } from '~/hooks/use-media-query'
import {
  formatDate,
  formatNumber,
  formatXof,
  paymentChannelLabel,
  paymentStatusMeta,
} from './admin-meta'
import {
  AdminPaymentDetail,
  type PaystackTransaction,
} from './admin-payment-detail'
import { m } from '~/lib/paraglide/messages'

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
  return m.admin_error_generic()
}

/**
 * Section « Paiements » du back-office : transactions reçues via Paystack en
 * master-detail (liste à gauche, détail d'une transaction à droite ; Sheet sous
 * `lg`), précédées de deux mini-widgets de synthèse. Une action Convex n'est PAS
 * réactive : on charge une fois au montage et on rafraîchit à la demande.
 */
export function AdminPaymentsPanel() {
  const fetchTransactions = useAction(api.admin.paystackTransactions)
  const [rows, setRows] = useState<PaystackTransaction[] | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const load = useCallback(
    async (withToast: boolean) => {
      setRefreshing(true)
      setError(undefined)
      try {
        const data = await fetchTransactions({})
        setRows(data)
        if (withToast) toast.success(m.admin_toast_payments_refreshed())
      } catch (e) {
        setError(errorMessage(e))
        setRows((prev) => prev ?? [])
        if (withToast) toast.error(m.admin_toast_refresh_failed())
      } finally {
        setRefreshing(false)
      }
    },
    [fetchTransactions],
  )

  useEffect(() => {
    void load(false)
  }, [load])

  // Si la transaction sélectionnée disparaît après actualisation, on referme.
  useEffect(() => {
    if (selectedId === null || !rows) return
    if (!rows.some((t) => t.id === selectedId)) setSelectedId(null)
  }, [rows, selectedId])

  const loading = rows === undefined
  const selected = useMemo(
    () => rows?.find((t) => t.id === selectedId) ?? null,
    [rows, selectedId],
  )
  const compact = selected !== null

  return (
    <section className="flex flex-col gap-5">
      {rows && rows.length > 0 && <PaymentsSummary rows={rows} />}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">
            {loading
              ? m.admin_payments_loading()
              : rows.length > 1
                ? m.admin_payments_count_plural({ n: formatNumber(rows.length) })
                : m.admin_payments_count_one({ n: formatNumber(rows.length) })}
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
            {m.admin_payments_refresh()}
          </Button>
        </div>

        {error && !loading && (rows?.length ?? 0) === 0 ? (
          <PaymentsError message={error} />
        ) : (
          <div className="flex gap-5">
            <div className={compact ? 'w-full shrink-0 lg:w-96' : 'w-full'}>
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
                {loading ? (
                  <PaymentsTableSkeleton />
                ) : rows.length === 0 ? (
                  <EmptyPayments />
                ) : (
                  <>
                    {/* Mobile (ou liste compacte) : cartes empilées. */}
                    <ul
                      className={
                        compact
                          ? 'flex flex-col divide-y divide-border'
                          : 'flex flex-col divide-y divide-border sm:hidden'
                      }
                    >
                      {rows.map((t) => (
                        <PaymentMobileCard
                          key={t.id}
                          tx={t}
                          selected={t.id === selectedId}
                          onSelect={setSelectedId}
                        />
                      ))}
                    </ul>
                    {!compact && (
                      <div className="hidden sm:block">
                        <PaymentsTable
                          rows={rows}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Panneau détail — desktop : colonne sticky à droite. */}
            {compact && selected && (
              <aside className="sticky top-0 hidden h-[calc(100dvh-9rem)] flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] lg:block">
                <AdminPaymentDetail
                  key={selected.id}
                  tx={selected}
                  onClose={() => setSelectedId(null)}
                />
              </aside>
            )}
          </div>
        )}
      </div>

      {/* Panneau détail — sous `lg` : Sheet plein écran. */}
      <Sheet
        open={compact && !isDesktop}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent
          side="right"
          className="w-full max-w-full gap-0 p-0 [&>button:last-child]:hidden"
        >
          <SheetTitle className="sr-only">Détail de la transaction</SheetTitle>
          <SheetDescription className="sr-only">
            Vue détaillée de la transaction sélectionnée.
          </SheetDescription>
          {selected && (
            <AdminPaymentDetail
              key={selected.id}
              tx={selected}
              onClose={() => setSelectedId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

/** Deux mini-widgets de synthèse : volume encaissé + transactions réussies. */
function PaymentsSummary({ rows }: { rows: PaystackTransaction[] }) {
  const successful = rows.filter((t) => t.status === 'success')
  const collectedXof = successful
    .filter((t) => t.currency === 'XOF')
    .reduce((sum, t) => sum + t.amount, 0)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <SummaryWidget
        icon={Wallet}
        label={m.admin_payments_collected()}
        value={formatXof(collectedXof)}
        hint={m.admin_payments_successful_hint()}
        accent
      />
      <SummaryWidget
        icon={CheckCircle2}
        label={m.admin_payments_successful()}
        value={`${formatNumber(successful.length)} / ${formatNumber(rows.length)}`}
        hint={m.admin_payments_period_hint()}
      />
    </div>
  )
}

function SummaryWidget({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Wallet
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <div className="reveal flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="eyebrow">{label}</span>
        <span
          className={
            accent
              ? 'assay text-2xl font-semibold tracking-[-0.02em] text-accent'
              : 'assay text-2xl font-semibold tracking-[-0.02em] text-fg'
          }
        >
          {value}
        </span>
        <span className="assay-meta text-xs">{hint}</span>
      </div>
      <span
        className={
          accent
            ? 'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent'
            : 'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-muted'
        }
      >
        <Icon className="size-4.5" />
      </span>
    </div>
  )
}

function PaymentsTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: PaystackTransaction[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-fg-muted">{m.admin_pay_col_amount()}</TableHead>
          <TableHead className="text-fg-muted">{m.admin_pay_col_email()}</TableHead>
          <TableHead className="text-fg-muted">{m.admin_pay_col_reference()}</TableHead>
          <TableHead className="text-fg-muted">{m.admin_pay_col_channel()}</TableHead>
          <TableHead className="text-fg-muted">{m.admin_pay_col_status()}</TableHead>
          <TableHead className="text-fg-muted">{m.admin_pay_col_date()}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => {
          const statusMeta = paymentStatusMeta(t.status)
          const isSelected = t.id === selectedId
          return (
            <TableRow
              key={t.id}
              onClick={() => onSelect(isSelected ? null : t.id)}
              data-state={isSelected ? 'selected' : undefined}
              className="cursor-pointer border-border data-[state=selected]:bg-accent-soft"
            >
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

/** Carte d'une transaction (affichage mobile et liste compacte). */
function PaymentMobileCard({
  tx,
  selected,
  onSelect,
}: {
  tx: PaystackTransaction
  selected: boolean
  onSelect: (id: number | null) => void
}) {
  const statusMeta = paymentStatusMeta(tx.status)
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(selected ? null : tx.id)}
        data-state={selected ? 'selected' : undefined}
        className="flex min-h-11 w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 data-[state=selected]:bg-accent-soft"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-medium text-fg">
            {tx.currency === 'XOF'
              ? formatXof(tx.amount)
              : `${formatNumber(tx.amount)} ${tx.currency}`}
          </span>
          <Badge variant={statusMeta.variant} className="shrink-0">
            {statusMeta.label}
          </Badge>
        </div>
        <p className="truncate text-sm text-fg-muted">{tx.email ?? '—'}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-subtle">
          <Badge variant="outline" className="shrink-0">
            {paymentChannelLabel(tx.channel)}
          </Badge>
          <span className="truncate font-mono">{tx.reference}</span>
          <span className="ml-auto whitespace-nowrap">
            {tx.paidAt ? formatDate(Date.parse(tx.paidAt)) : '—'}
          </span>
        </div>
      </button>
    </li>
  )
}

function EmptyPayments() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-subtle">
        <CreditCard className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">
        {m.admin_payments_empty_title()}
      </p>
      <p className="max-w-xs text-sm text-fg-muted">
        {m.admin_payments_empty_desc()}
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
      <p className="text-sm font-medium text-fg">{m.admin_load_failed()}</p>
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
