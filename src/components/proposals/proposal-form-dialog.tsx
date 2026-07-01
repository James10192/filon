import { useEffect, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { toast } from '~/components/ui/sonner'
import {
  AmountAndCurrencyFields,
  DocumentTypePicker,
  PitchField,
  ProformaFields,
  TextField,
} from './proposal-form-fields'
import {
  normalizeProposalKind,
  type ProposalKind,
} from './proposal-kind'
import type { ProposalLineInput } from './proposal-lines-editor'
import {
  ProposalRecipientsEditor,
  type RecipientTarget,
} from './proposal-recipients-editor'

type ProposalDoc = Doc<'proposals'>

type ProposalInitialDraft = {
  title?: string
  pitch?: string
  amount?: number
  currency?: string
  kind?: ProposalKind
  lineItems?: ProposalLineInput[]
  validUntil?: string
  terms?: string
  clientNote?: string
}

type ProposalInitialRecipient = {
  targetType: RecipientTarget
  companyId?: Id<'companies'>
  contactId?: Id<'contacts'>
  opportunityId?: Id<'opportunities'>
}

export function ProposalFormDialog({
  open,
  onOpenChange,
  proposal,
  initialDraft,
  initialRecipient,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal?: ProposalDoc | null
  initialDraft?: ProposalInitialDraft | null
  initialRecipient?: ProposalInitialRecipient | null
  onCreated?: (proposalId: Id<'proposals'>) => void
}) {
  const create = useMutation(api.proposals.create)
  const update = useMutation(api.proposals.update)
  const addRecipient = useMutation(api.proposalRecipients.addRecipient)

  const [workingId, setWorkingId] = useState<Id<'proposals'> | null>(null)
  const activeId = proposal?._id ?? workingId

  const [title, setTitle] = useState('')
  const [pitch, setPitch] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<string>('XOF')
  const [kind, setKind] = useState<ProposalKind>('proposal')
  const [lineItems, setLineItems] = useState<ProposalLineInput[]>([
    { label: '', quantity: 1, unitPrice: 0 },
  ])
  const [validUntil, setValidUntil] = useState('')
  const [terms, setTerms] = useState('')
  const [clientNote, setClientNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; pitch?: string }>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setSubmitting(false)
    setWorkingId(null)
    if (proposal) {
      setKind(normalizeProposalKind(proposal.kind))
      setTitle(proposal.title)
      setPitch(proposal.pitch)
      setAmount(proposal.amount !== undefined ? String(proposal.amount) : '')
      setCurrency(proposal.currency ?? 'XOF')
      setLineItems(normalizeInitialLines(proposal))
      setValidUntil(proposal.validUntil ?? '')
      setTerms(proposal.terms ?? '')
      setClientNote(proposal.clientNote ?? '')
      return
    }
    setKind(initialDraft?.kind ?? 'proposal')
    setTitle(initialDraft?.title ?? '')
    setPitch(initialDraft?.pitch ?? '')
    setAmount(initialDraft?.amount !== undefined ? String(initialDraft.amount) : '')
    setCurrency(initialDraft?.currency ?? 'XOF')
    setLineItems(normalizeDraftLines(initialDraft))
    setValidUntil(initialDraft?.validUntil ?? '')
    setTerms(initialDraft?.terms ?? '')
    setClientNote(initialDraft?.clientNote ?? '')
  }, [open, proposal, initialDraft])

  const parsedAmount = useMemo(
    () => (amount.trim() ? Number(amount.replace(/\s/g, '')) : undefined),
    [amount],
  )

  const cleanedLineItems = useMemo(
    () =>
      lineItems
        .map((line) => {
          const next: ProposalLineInput = {
            label: line.label.trim(),
            quantity: Number(line.quantity) || 0,
            unitPrice: Number(line.unitPrice) || 0,
          }
          const description = line.description?.trim()
          if (description) next.description = description
          return next
        })
        .filter((line) => line.label && line.quantity > 0),
    [lineItems],
  )

  async function handleSaveOffer(event: React.FormEvent) {
    event.preventDefault()
    if (submitting || !validate()) return
    if (parsedAmount !== undefined && Number.isNaN(parsedAmount)) {
      toast.error(m.prop_error_amount_number())
      return
    }
    if (kind === 'proforma' && cleanedLineItems.length === 0) {
      toast.error('Ajoutez au moins une ligne commerciale à la proforma.')
      return
    }

    setSubmitting(true)
    try {
      const id = await saveProposal()
      if (!proposal && !workingId) {
        await attachInitialRecipient(id)
        setWorkingId(id)
        onCreated?.(id)
      }
      toast.success(proposal ? m.prop_toast_updated() : m.prop_toast_offer_saved())
    } catch {
      toast.error(m.prop_toast_offer_save_error())
    } finally {
      setSubmitting(false)
    }
  }

  function validate() {
    const next: { title?: string; pitch?: string } = {}
    if (!title.trim()) next.title = m.prop_error_title_required()
    if (!pitch.trim()) next.pitch = m.prop_error_pitch_required()
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function saveProposal() {
    const targetId = proposal?._id ?? workingId
    const payload = buildProposalPayload({
      title,
      pitch,
      currency,
      kind,
      parsedAmount,
      lineItems: cleanedLineItems,
      validUntil,
      terms,
      clientNote,
    })
    if (targetId) {
      await update({ id: targetId, ...payload })
      return targetId
    }
    return await create(payload)
  }

  async function attachInitialRecipient(proposalId: Id<'proposals'>) {
    if (!initialRecipient) return
    const hasTarget =
      (initialRecipient.targetType === 'company' && initialRecipient.companyId) ||
      (initialRecipient.targetType === 'person' && initialRecipient.contactId)
    if (!hasTarget) return
    try {
      const args: {
        proposalId: Id<'proposals'>
        targetType: RecipientTarget
        companyId?: Id<'companies'>
        contactId?: Id<'contacts'>
        opportunityId?: Id<'opportunities'>
      } = { proposalId, targetType: initialRecipient.targetType }
      if (initialRecipient.companyId) args.companyId = initialRecipient.companyId
      if (initialRecipient.contactId) args.contactId = initialRecipient.contactId
      if (initialRecipient.opportunityId) {
        args.opportunityId = initialRecipient.opportunityId
      }
      await addRecipient(args)
    } catch {
      toast.error(
        'Le document a été créé, mais le rattachement à l’opportunité a échoué.',
      )
    }
  }

  const saveLabel = proposal
    ? m.prop_save()
    : workingId
      ? m.prop_save_offer_update()
      : m.prop_save_offer()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {proposal ? m.prop_dialog_title_edit() : m.prop_dialog_title_new()}
          </DialogTitle>
          <DialogDescription>{m.prop_dialog_description()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveOffer} className="flex flex-col gap-4">
          <DocumentTypePicker kind={kind} onChange={setKind} />
          <TextField
            id="proposal-title"
            label={m.prop_field_title()}
            value={title}
            error={errors.title}
            placeholder={m.prop_field_title_placeholder()}
            onChange={setTitle}
          />
          <PitchField value={pitch} error={errors.pitch} onChange={setPitch} />
          <AmountAndCurrencyFields
            kind={kind}
            amount={amount}
            validUntil={validUntil}
            currency={currency}
            onAmount={setAmount}
            onValidUntil={setValidUntil}
            onCurrency={setCurrency}
          />
          {kind === 'proforma' && (
            <ProformaFields
              lineItems={lineItems}
              currency={currency}
              terms={terms}
              clientNote={clientNote}
              onLineItems={setLineItems}
              onTerms={setTerms}
              onClientNote={setClientNote}
            />
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting} variant="outline">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {saveLabel}
            </Button>
          </div>
        </form>

        <ProposalRecipientsEditor proposalId={activeId} />

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {m.prop_close()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function normalizeInitialLines(proposal: ProposalDoc): ProposalLineInput[] {
  if (proposal.lineItems?.length) return proposal.lineItems
  return [{ label: proposal.title, quantity: 1, unitPrice: proposal.amount ?? 0 }]
}

function normalizeDraftLines(
  draft: ProposalInitialDraft | null | undefined,
): ProposalLineInput[] {
  if (draft?.lineItems?.length) return draft.lineItems
  return [{ label: draft?.title ?? '', quantity: 1, unitPrice: draft?.amount ?? 0 }]
}

function buildProposalPayload({
  title,
  pitch,
  currency,
  kind,
  parsedAmount,
  lineItems,
  validUntil,
  terms,
  clientNote,
}: {
  title: string
  pitch: string
  currency: string
  kind: ProposalKind
  parsedAmount?: number
  lineItems: ProposalLineInput[]
  validUntil: string
  terms: string
  clientNote: string
}) {
  const payload: {
    title: string
    pitch: string
    currency: string
    kind: ProposalKind
    lineItems?: ProposalLineInput[]
    validUntil?: string
    terms?: string
    clientNote?: string
    amount?: number
  } = { title: title.trim(), pitch: pitch.trim(), currency, kind }
  if (kind === 'proforma') {
    payload.lineItems = lineItems
    payload.validUntil = validUntil.trim()
    payload.terms = terms.trim()
    payload.clientNote = clientNote.trim()
  } else if (parsedAmount !== undefined) {
    payload.amount = parsedAmount
  }
  return payload
}
