import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'
import {
  proposalKindDescription,
  proposalKindLabel,
  type ProposalKind,
} from './proposal-kind'
import {
  ProposalLinesEditor,
  type ProposalLineInput,
} from './proposal-lines-editor'

const CURRENCIES = ['XOF', 'EUR', 'USD'] as const

export function DocumentTypePicker({
  kind,
  onChange,
}: {
  kind: ProposalKind
  onChange: (kind: ProposalKind) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Type de document</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(['proposal', 'proforma'] as ProposalKind[]).map((value) => (
          <Button
            key={value}
            type="button"
            variant="outline"
            onClick={() => onChange(value)}
            className={cn(
              'h-auto min-h-11 flex-col items-start gap-1 px-3 py-3 text-left whitespace-normal transition-colors',
              kind === value
                ? 'border-accent bg-accent-soft text-fg'
                : 'border-border bg-surface text-fg-muted hover:bg-surface-2',
            )}
          >
            <span className="text-sm font-medium text-fg">
              {proposalKindLabel(value)}
            </span>
            <span className="text-xs leading-relaxed text-fg-muted">
              {proposalKindDescription(value)}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}

export function TextField({
  id,
  label,
  value,
  error,
  placeholder,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  placeholder: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function PitchField({
  value,
  error,
  onChange,
}: {
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="proposal-pitch">{m.prop_field_pitch()}</Label>
      <Textarea
        id="proposal-pitch"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={m.prop_field_pitch_placeholder()}
        className="min-h-28"
        aria-invalid={Boolean(error)}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function AmountAndCurrencyFields({
  kind,
  amount,
  validUntil,
  currency,
  onAmount,
  onValidUntil,
  onCurrency,
}: {
  kind: ProposalKind
  amount: string
  validUntil: string
  currency: string
  onAmount: (value: string) => void
  onValidUntil: (value: string) => void
  onCurrency: (value: string) => void
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      {kind === 'proposal' ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proposal-amount">{m.prop_field_amount()}</Label>
          <Input
            id="proposal-amount"
            inputMode="numeric"
            value={amount}
            onChange={(event) => onAmount(event.target.value)}
            placeholder={m.prop_field_amount_placeholder()}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proposal-valid-until">Validité</Label>
          <Input
            id="proposal-valid-until"
            type="date"
            value={validUntil}
            onChange={(event) => onValidUntil(event.target.value)}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proposal-currency">{m.prop_field_currency()}</Label>
        <Select value={currency} onValueChange={onCurrency}>
          <SelectTrigger id="proposal-currency" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function ProformaFields({
  lineItems,
  currency,
  terms,
  clientNote,
  onLineItems,
  onTerms,
  onClientNote,
}: {
  lineItems: ProposalLineInput[]
  currency: string
  terms: string
  clientNote: string
  onLineItems: (items: ProposalLineInput[]) => void
  onTerms: (value: string) => void
  onClientNote: (value: string) => void
}) {
  return (
    <>
      <ProposalLinesEditor
        lines={lineItems}
        currency={currency}
        onChange={onLineItems}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proposal-terms">Conditions</Label>
          <Textarea
            id="proposal-terms"
            value={terms}
            onChange={(event) => onTerms(event.target.value)}
            placeholder="Ex. paiement à réception, délai de livraison..."
            className="min-h-20"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proposal-client-note">Note client</Label>
          <Textarea
            id="proposal-client-note"
            value={clientNote}
            onChange={(event) => onClientNote(event.target.value)}
            placeholder="Note visible sur le document"
            className="min-h-20"
          />
        </div>
      </div>
    </>
  )
}

export type CommercialDocumentFieldsValue = {
  language: 'fr' | 'en'
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  recipientAddress: string
  discountType: 'fixed' | 'percent'
  discountValue: string
  taxLabel: string
  taxRate: string
  depositAmount: string
}

export function CommercialDocumentFields({
  value,
  onChange,
}: {
  value: CommercialDocumentFieldsValue
  onChange: (next: CommercialDocumentFieldsValue) => void
}) {
  function patch(next: Partial<CommercialDocumentFieldsValue>) {
    onChange({ ...value, ...next })
  }

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface-2 p-3">
      <div>
        <Label>Document commercial</Label>
        <p className="text-xs text-fg-muted">Les coordonnées ci-dessous sont propres à ce document.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="document-language">Langue du document</Label>
          <Select value={value.language} onValueChange={(language) => patch({ language: language as 'fr' | 'en' })}>
            <SelectTrigger id="document-language"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="billing-recipient">Client facturé</Label>
          <Input id="billing-recipient" value={value.recipientName} onChange={(event) => patch({ recipientName: event.target.value })} placeholder="Raison sociale ou nom" />
        </div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="billing-email">Email client</Label><Input id="billing-email" type="email" value={value.recipientEmail} onChange={(event) => patch({ recipientEmail: event.target.value })} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="billing-phone">Téléphone client</Label><Input id="billing-phone" value={value.recipientPhone} onChange={(event) => patch({ recipientPhone: event.target.value })} /></div>
      </div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="billing-address">Adresse de facturation</Label><Textarea id="billing-address" value={value.recipientAddress} onChange={(event) => patch({ recipientAddress: event.target.value })} className="min-h-16" /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5"><Label htmlFor="discount-value">Remise</Label><Input id="discount-value" inputMode="decimal" value={value.discountValue} onChange={(event) => patch({ discountValue: event.target.value })} placeholder="0" /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="discount-type">Type</Label><Select value={value.discountType} onValueChange={(discountType) => patch({ discountType: discountType as 'fixed' | 'percent' })}><SelectTrigger id="discount-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Montant</SelectItem><SelectItem value="percent">Pourcentage</SelectItem></SelectContent></Select></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="deposit">Acompte</Label><Input id="deposit" inputMode="decimal" value={value.depositAmount} onChange={(event) => patch({ depositAmount: event.target.value })} placeholder="0" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><div className="flex flex-col gap-1.5"><Label htmlFor="tax-label">Taxe</Label><Input id="tax-label" value={value.taxLabel} onChange={(event) => patch({ taxLabel: event.target.value })} placeholder="Ex. TVA" /></div><div className="flex flex-col gap-1.5"><Label htmlFor="tax-rate">Taux (%)</Label><Input id="tax-rate" inputMode="decimal" value={value.taxRate} onChange={(event) => patch({ taxRate: event.target.value })} placeholder="0" /></div></div>
    </section>
  )
}
