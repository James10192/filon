import { CreditCard, Hash, Mail, X } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  formatDate,
  formatNumber,
  formatXof,
  paymentChannelLabel,
  paymentStatusMeta,
} from './admin-meta'
import { m } from '~/lib/paraglide/messages'

export type PaystackTransaction = {
  id: number
  amount: number
  currency: string
  status: string
  reference: string
  channel: string | null
  paidAt: string | null
  email: string | null
}

function amountLabel(tx: PaystackTransaction): string {
  return tx.currency === 'XOF'
    ? formatXof(tx.amount)
    : `${formatNumber(tx.amount)} ${tx.currency}`
}

/**
 * Panneau détail d'UNE transaction Paystack (master-detail du back-office).
 * Présente le montant en évidence, le statut, le client, le canal, la référence
 * et la date. Pas de requête supplémentaire : la ligne provient déjà de l'action
 * `paystackTransactions` (non réactive).
 */
export function AdminPaymentDetail({
  tx,
  onClose,
}: {
  tx: PaystackTransaction
  onClose: () => void
}) {
  const statusMeta = paymentStatusMeta(tx.status)
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-muted">
            <CreditCard className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="assay truncate text-lg font-semibold tracking-[-0.02em] text-fg">
              {amountLabel(tx)}
            </span>
            <Badge variant={statusMeta.variant} className="w-fit">
              {statusMeta.label}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={m.admin_close_detail()}
          className="h-11 w-11 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{m.admin_pay_detail_title()}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label={m.admin_pay_field_amount()} value={amountLabel(tx)} />
            <Field label={m.admin_pay_field_currency()} value={tx.currency} />
            <Field label={m.admin_pay_field_channel()} value={paymentChannelLabel(tx.channel)} />
            <Field
              label={m.admin_pay_field_date()}
              value={tx.paidAt ? formatDate(Date.parse(tx.paidAt)) : '—'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{m.admin_pay_client_title()}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {tx.email ? (
              <a
                href={`mailto:${tx.email}`}
                className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
              >
                <Mail className="size-4 shrink-0" />
                {tx.email}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
                <Mail className="size-4 shrink-0 text-fg-subtle" />
                {m.admin_pay_no_email()}
              </span>
            )}
            <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
              <Hash className="size-4 shrink-0 text-fg-subtle" />
              <code className="break-all rounded-[var(--radius-sm)] bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
                {tx.reference}
              </code>
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-fg-subtle">{label}</span>
      <span className="assay text-sm font-medium text-fg">{value}</span>
    </div>
  )
}
