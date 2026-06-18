import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Building2, Loader2, Plus, Trash2, User } from 'lucide-react'
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
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { EntityCombobox } from '~/components/ui/entity-combobox'
import { toast } from '~/components/ui/sonner'
import { cn } from '~/lib/utils'
import { STATUS_BADGE } from './proposal-status'

type ProposalDoc = Doc<'proposals'>

const CURRENCIES = ['XOF', 'EUR', 'USD'] as const

type RecipientTarget = 'company' | 'person'
type RecipientStatus = 'pending' | 'sent' | 'accepted' | 'refused'

const RECIPIENT_STATUSES: RecipientStatus[] = [
  'pending',
  'sent',
  'accepted',
  'refused',
]

// Le statut d'un destinataire reprend les libelles de proposition, plus
// "pending" (en attente d'envoi) propre aux destinataires.
const RECIPIENT_STATUS_LABELS: Record<string, string> = {
  pending: m.prop_recipient_status_pending(),
  sent: m.prop_recipient_status_sent(),
  accepted: m.prop_recipient_status_accepted(),
  refused: m.prop_recipient_status_refused(),
}

const RECIPIENT_STATUS_BADGE: Record<
  string,
  NonNullable<React.ComponentProps<typeof Badge>['variant']>
> = {
  pending: 'outline',
  sent: STATUS_BADGE.sent,
  accepted: STATUS_BADGE.accepted,
  refused: STATUS_BADGE.refused,
}

export function ProposalFormDialog({
  open,
  onOpenChange,
  proposal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si fourni, le dialog edite cette proposition. Sinon, creation. */
  proposal?: ProposalDoc | null
}) {
  const companies = useQuery(api.companies.list, open ? {} : 'skip')
  const contacts = useQuery(api.contacts.list, open ? {} : 'skip')
  const create = useMutation(api.proposals.create)
  const update = useMutation(api.proposals.update)
  const createCompany = useMutation(api.companies.create)
  const createContact = useMutation(api.contacts.create)
  const addRecipient = useMutation(api.proposalRecipients.addRecipient)
  const removeRecipient = useMutation(api.proposalRecipients.removeRecipient)
  const updateRecipientStatus = useMutation(
    api.proposalRecipients.updateRecipientStatus,
  )

  // Id de la proposition en cours : celui passe en edition, ou celui cree dans
  // ce dialog (on bascule alors sur la gestion des destinataires).
  const [workingId, setWorkingId] = useState<Id<'proposals'> | null>(null)
  const activeId = proposal?._id ?? workingId

  const recipients = useQuery(
    api.proposalRecipients.listByProposal,
    open && activeId ? { proposalId: activeId } : 'skip',
  )

  const [title, setTitle] = useState('')
  const [pitch, setPitch] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<string>('XOF')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; pitch?: string }>({})

  // Composeur de destinataire.
  const [recipientTarget, setRecipientTarget] =
    useState<RecipientTarget>('company')
  const [recipientCompanyId, setRecipientCompanyId] = useState('__none__')
  const [recipientContactId, setRecipientContactId] = useState('__none__')
  const [addingRecipient, setAddingRecipient] = useState(false)

  const isComposed = Boolean(activeId)

  // Réinitialise le formulaire à chaque ouverture (et selon la cible d'édition).
  useEffect(() => {
    if (!open) return
    setErrors({})
    setSubmitting(false)
    setWorkingId(null)
    setRecipientTarget('company')
    setRecipientCompanyId('__none__')
    setRecipientContactId('__none__')
    if (proposal) {
      setTitle(proposal.title)
      setPitch(proposal.pitch)
      setAmount(proposal.amount !== undefined ? String(proposal.amount) : '')
      setCurrency(proposal.currency ?? 'XOF')
    } else {
      setTitle('')
      setPitch('')
      setAmount('')
      setCurrency('XOF')
    }
  }, [open, proposal])

  const parsedAmount = useMemo(() => {
    return amount.trim() ? Number(amount.replace(/\s/g, '')) : undefined
  }, [amount])

  function validate() {
    const next: { title?: string; pitch?: string } = {}
    if (!title.trim()) next.title = m.prop_error_title_required()
    if (!pitch.trim()) next.pitch = m.prop_error_pitch_required()
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleCreateCompany(name: string) {
    try {
      const id = await createCompany({ name })
      toast.success(m.prop_toast_company_created())
      return id as string
    } catch {
      toast.error(m.prop_toast_company_create_error())
      return null
    }
  }

  async function handleCreateContact(name: string) {
    try {
      const id = await createContact({ name })
      toast.success(m.prop_toast_contact_created())
      return id as string
    } catch {
      toast.error(m.prop_toast_contact_create_error())
      return null
    }
  }

  /** Enregistre l'offre (titre/pitch/montant/devise). Sur creation, bascule en
   *  gestion des destinataires sans fermer le dialog. */
  async function handleSaveOffer(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    if (!validate()) return
    if (parsedAmount !== undefined && Number.isNaN(parsedAmount)) {
      toast.error(m.prop_error_amount_number())
      return
    }

    setSubmitting(true)
    try {
      if (proposal) {
        const args: {
          id: Id<'proposals'>
          title: string
          pitch: string
          currency: string
          amount?: number
        } = {
          id: proposal._id,
          title: title.trim(),
          pitch: pitch.trim(),
          currency,
        }
        if (parsedAmount !== undefined) args.amount = parsedAmount
        await update(args)
        toast.success(m.prop_toast_updated())
      } else if (workingId) {
        const args: {
          id: Id<'proposals'>
          title: string
          pitch: string
          currency: string
          amount?: number
        } = {
          id: workingId,
          title: title.trim(),
          pitch: pitch.trim(),
          currency,
        }
        if (parsedAmount !== undefined) args.amount = parsedAmount
        await update(args)
        toast.success(m.prop_toast_offer_updated())
      } else {
        const args: {
          title: string
          pitch: string
          currency: string
          amount?: number
        } = {
          title: title.trim(),
          pitch: pitch.trim(),
          currency,
        }
        if (parsedAmount !== undefined) args.amount = parsedAmount
        const id = await create(args)
        setWorkingId(id)
        toast.success(m.prop_toast_offer_saved())
      }
    } catch {
      toast.error(m.prop_toast_offer_save_error())
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddRecipient() {
    if (!activeId || addingRecipient) return
    const args: {
      proposalId: Id<'proposals'>
      targetType: RecipientTarget
      companyId?: Id<'companies'>
      contactId?: Id<'contacts'>
    } = { proposalId: activeId, targetType: recipientTarget }

    if (recipientTarget === 'company') {
      if (recipientCompanyId === '__none__') {
        toast.error(m.prop_error_choose_company())
        return
      }
      args.companyId = recipientCompanyId as Id<'companies'>
    } else {
      if (recipientContactId === '__none__') {
        toast.error(m.prop_error_choose_contact())
        return
      }
      args.contactId = recipientContactId as Id<'contacts'>
    }

    setAddingRecipient(true)
    try {
      await addRecipient(args)
      toast.success(m.prop_toast_recipient_added())
      setRecipientCompanyId('__none__')
      setRecipientContactId('__none__')
    } catch {
      toast.error(m.prop_toast_recipient_add_error())
    } finally {
      setAddingRecipient(false)
    }
  }

  async function handleRecipientStatus(
    id: Id<'proposalRecipients'>,
    status: RecipientStatus,
  ) {
    try {
      await updateRecipientStatus({ id, status })
    } catch {
      toast.error(m.prop_toast_status_update_error())
    }
  }

  async function handleRemoveRecipient(id: Id<'proposalRecipients'>) {
    try {
      await removeRecipient({ id })
      toast.success(m.prop_toast_recipient_removed())
    } catch {
      toast.error(m.prop_toast_recipient_remove_error())
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
          <DialogDescription>
            {m.prop_dialog_description()}
          </DialogDescription>
        </DialogHeader>

        {/* ---------------------------------------------------------------- */}
        {/* Section : l'offre */}
        {/* ---------------------------------------------------------------- */}
        <form onSubmit={handleSaveOffer} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proposal-title">{m.prop_field_title()}</Label>
            <Input
              id="proposal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={m.prop_field_title_placeholder()}
              aria-invalid={Boolean(errors.title)}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-danger">{errors.title}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proposal-pitch">{m.prop_field_pitch()}</Label>
            <Textarea
              id="proposal-pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder={m.prop_field_pitch_placeholder()}
              className="min-h-28"
              aria-invalid={Boolean(errors.pitch)}
            />
            {errors.pitch && (
              <p className="text-xs text-danger">{errors.pitch}</p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proposal-amount">{m.prop_field_amount()}</Label>
              <Input
                id="proposal-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={m.prop_field_amount_placeholder()}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proposal-currency">{m.prop_field_currency()}</Label>
              <Select value={currency} onValueChange={setCurrency}>
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

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting} variant="outline">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {saveLabel}
            </Button>
          </div>
        </form>

        {/* ---------------------------------------------------------------- */}
        {/* Section : destinataires */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <div>
            <h3 className="text-sm font-medium text-fg">{m.prop_recipients_heading()}</h3>
            <p className="text-xs text-fg-muted">
              {isComposed
                ? m.prop_recipients_help_composed()
                : m.prop_recipients_help_not_composed()}
            </p>
          </div>

          {isComposed && (
            <>
              {/* Liste des destinataires existants */}
              {recipients === undefined ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-fg-subtle">
                  <Loader2 className="size-4 animate-spin" />
                  {m.prop_loading()}
                </div>
              ) : recipients.length === 0 ? (
                <p className="rounded-[var(--radius)] border border-dashed border-border bg-surface-2 px-3 py-4 text-center text-sm text-fg-subtle">
                  {m.prop_recipients_empty_short()}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {recipients.map((r) => {
                    const Icon =
                      r.targetType === 'company' ? Building2 : User
                    const name =
                      r.targetName ??
                      (r.targetType === 'company'
                        ? m.prop_fallback_company()
                        : m.prop_fallback_contact())
                    return (
                      <li
                        key={r._id}
                        className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-surface px-3 py-2"
                      >
                        <Icon className="size-4 shrink-0 text-fg-subtle" />
                        <span className="min-w-0 flex-1 truncate text-sm text-fg">
                          {name}
                        </span>
                        <Badge variant={RECIPIENT_STATUS_BADGE[r.status]}>
                          {RECIPIENT_STATUS_LABELS[r.status]}
                        </Badge>
                        <Select
                          value={r.status}
                          onValueChange={(v) =>
                            handleRecipientStatus(r._id, v as RecipientStatus)
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-32"
                            aria-label={m.prop_recipient_status_aria({ name })}
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-fg-subtle hover:text-danger"
                          onClick={() => handleRemoveRecipient(r._id)}
                          aria-label={m.prop_recipient_remove_aria({ name })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* Composeur d'un nouveau destinataire */}
              <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface-2 p-3">
                <div
                  role="radiogroup"
                  aria-label={m.prop_recipient_type_aria()}
                  className="grid grid-cols-2 gap-2"
                >
                  {(['company', 'person'] as RecipientTarget[]).map((key) => {
                    const Icon = key === 'company' ? Building2 : User
                    const label =
                      key === 'company'
                        ? m.prop_target_company()
                        : m.prop_target_person()
                    const active = recipientTarget === key
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setRecipientTarget(key)}
                        className={cn(
                          'flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius)] border px-2 text-sm font-medium transition-colors',
                          active
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border bg-surface text-fg-muted hover:bg-surface-2',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {label}
                      </button>
                    )
                  })}
                </div>

                {recipientTarget === 'company' ? (
                  <EntityCombobox
                    items={(companies ?? []).map((c) => ({
                      value: c._id,
                      label: c.name,
                    }))}
                    value={recipientCompanyId}
                    onChange={setRecipientCompanyId}
                    onCreate={handleCreateCompany}
                    emptyValue="__none__"
                    placeholder={m.prop_combobox_company_placeholder()}
                    searchPlaceholder={m.prop_combobox_company_search()}
                    noResultLabel={m.prop_combobox_company_empty()}
                    createLabel={m.prop_combobox_company_create()}
                  />
                ) : (
                  <EntityCombobox
                    items={(contacts ?? []).map((c) => {
                      const companyName =
                        'companyName' in c ? c.companyName : undefined
                      return {
                        value: c._id,
                        label: companyName
                          ? `${c.name} · ${companyName}`
                          : c.name,
                      }
                    })}
                    value={recipientContactId}
                    onChange={setRecipientContactId}
                    onCreate={handleCreateContact}
                    emptyValue="__none__"
                    placeholder={m.prop_combobox_contact_placeholder()}
                    searchPlaceholder={m.prop_combobox_contact_search()}
                    noResultLabel={m.prop_combobox_contact_empty()}
                    createLabel={m.prop_combobox_contact_create()}
                  />
                )}

                <Button
                  type="button"
                  onClick={handleAddRecipient}
                  disabled={addingRecipient}
                >
                  {addingRecipient ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {m.prop_add_recipient()}
                </Button>
              </div>
            </>
          )}
        </div>

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
