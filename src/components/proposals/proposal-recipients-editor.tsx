import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Building2, Loader2, Plus, Trash2, User } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { EntityCombobox } from '~/components/ui/entity-combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { toast } from '~/components/ui/sonner'
import { cn } from '~/lib/utils'
import { STATUS_BADGE } from './proposal-status'

export type RecipientTarget = 'company' | 'person'
type RecipientStatus = 'pending' | 'sent' | 'accepted' | 'refused'

const RECIPIENT_STATUSES: RecipientStatus[] = [
  'pending',
  'sent',
  'accepted',
  'refused',
]

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

export function ProposalRecipientsEditor({
  proposalId,
}: {
  proposalId: Id<'proposals'> | null
}) {
  const companies = useQuery(api.companies.list, proposalId ? {} : 'skip')
  const contacts = useQuery(api.contacts.list, proposalId ? {} : 'skip')
  const recipients = useQuery(
    api.proposalRecipients.listByProposal,
    proposalId ? { proposalId } : 'skip',
  )
  const createCompany = useMutation(api.companies.create)
  const createContact = useMutation(api.contacts.create)
  const addRecipient = useMutation(api.proposalRecipients.addRecipient)
  const removeRecipient = useMutation(api.proposalRecipients.removeRecipient)
  const updateRecipientStatus = useMutation(
    api.proposalRecipients.updateRecipientStatus,
  )

  const [recipientTarget, setRecipientTarget] =
    useState<RecipientTarget>('company')
  const [recipientCompanyId, setRecipientCompanyId] = useState('__none__')
  const [recipientContactId, setRecipientContactId] = useState('__none__')
  const [addingRecipient, setAddingRecipient] = useState(false)

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

  async function handleAddRecipient() {
    if (!proposalId || addingRecipient) return
    const args: {
      proposalId: Id<'proposals'>
      targetType: RecipientTarget
      companyId?: Id<'companies'>
      contactId?: Id<'contacts'>
    } = { proposalId, targetType: recipientTarget }

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

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <h3 className="text-sm font-medium text-fg">
          {m.prop_recipients_heading()}
        </h3>
        <p className="text-xs text-fg-muted">
          {proposalId
            ? m.prop_recipients_help_composed()
            : m.prop_recipients_help_not_composed()}
        </p>
      </div>

      {proposalId && (
        <>
          <RecipientList
            recipients={recipients}
            onStatus={handleRecipientStatus}
            onRemove={handleRemoveRecipient}
          />
          <RecipientComposer
            companies={companies ?? []}
            contacts={contacts ?? []}
            target={recipientTarget}
            companyId={recipientCompanyId}
            contactId={recipientContactId}
            adding={addingRecipient}
            onTarget={setRecipientTarget}
            onCompany={setRecipientCompanyId}
            onContact={setRecipientContactId}
            onCreateCompany={handleCreateCompany}
            onCreateContact={handleCreateContact}
            onAdd={handleAddRecipient}
          />
        </>
      )}
    </div>
  )
}

function RecipientList({
  recipients,
  onStatus,
  onRemove,
}: {
  recipients:
    | Array<{
        _id: Id<'proposalRecipients'>
        targetType: RecipientTarget
        targetName?: string
        status: RecipientStatus
      }>
    | undefined
  onStatus: (id: Id<'proposalRecipients'>, status: RecipientStatus) => void
  onRemove: (id: Id<'proposalRecipients'>) => void
}) {
  if (recipients === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-fg-subtle">
        <Loader2 className="size-4 animate-spin" />
        {m.prop_loading()}
      </div>
    )
  }
  if (recipients.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-dashed border-border bg-surface-2 px-3 py-4 text-center text-sm text-fg-subtle">
        {m.prop_recipients_empty_short()}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {recipients.map((recipient) => {
        const Icon = recipient.targetType === 'company' ? Building2 : User
        const name =
          recipient.targetName ??
          (recipient.targetType === 'company'
            ? m.prop_fallback_company()
            : m.prop_fallback_contact())
        return (
          <li
            key={recipient._id}
            className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-surface px-3 py-2"
          >
            <Icon className="size-4 shrink-0 text-fg-subtle" />
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              {name}
            </span>
            <Badge variant={RECIPIENT_STATUS_BADGE[recipient.status]}>
              {RECIPIENT_STATUS_LABELS[recipient.status]}
            </Badge>
            <Select
              value={recipient.status}
              onValueChange={(value) =>
                onStatus(recipient._id, value as RecipientStatus)
              }
            >
              <SelectTrigger
                className="h-8 w-32"
                aria-label={m.prop_recipient_status_aria({ name })}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECIPIENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {RECIPIENT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-fg-subtle hover:text-danger"
              onClick={() => onRemove(recipient._id)}
              aria-label={m.prop_recipient_remove_aria({ name })}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

function RecipientComposer({
  companies,
  contacts,
  target,
  companyId,
  contactId,
  adding,
  onTarget,
  onCompany,
  onContact,
  onCreateCompany,
  onCreateContact,
  onAdd,
}: {
  companies: Array<{ _id: Id<'companies'>; name: string }>
  contacts: Array<{ _id: Id<'contacts'>; name: string; companyName?: string }>
  target: RecipientTarget
  companyId: string
  contactId: string
  adding: boolean
  onTarget: (target: RecipientTarget) => void
  onCompany: (id: string) => void
  onContact: (id: string) => void
  onCreateCompany: (name: string) => Promise<string | null>
  onCreateContact: (name: string) => Promise<string | null>
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface-2 p-3">
      <div
        role="radiogroup"
        aria-label={m.prop_recipient_type_aria()}
        className="grid grid-cols-2 gap-2"
      >
        {(['company', 'person'] as RecipientTarget[]).map((key) => {
          const Icon = key === 'company' ? Building2 : User
          const label =
            key === 'company' ? m.prop_target_company() : m.prop_target_person()
          const active = target === key
          return (
            <Button
              key={key}
              type="button"
              variant="outline"
              role="radio"
              aria-checked={active}
              onClick={() => onTarget(key)}
              className={cn(
                'h-11 items-center justify-center gap-1.5 px-2 text-sm font-medium transition-colors',
                active
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface text-fg-muted hover:bg-surface-2',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Button>
          )
        })}
      </div>

      {target === 'company' ? (
        <EntityCombobox
          items={companies.map((company) => ({
            value: company._id,
            label: company.name,
          }))}
          value={companyId}
          onChange={onCompany}
          onCreate={onCreateCompany}
          emptyValue="__none__"
          placeholder={m.prop_combobox_company_placeholder()}
          searchPlaceholder={m.prop_combobox_company_search()}
          noResultLabel={m.prop_combobox_company_empty()}
          createLabel={m.prop_combobox_company_create()}
        />
      ) : (
        <EntityCombobox
          items={contacts.map((contact) => ({
            value: contact._id,
            label: contact.companyName
              ? `${contact.name} · ${contact.companyName}`
              : contact.name,
          }))}
          value={contactId}
          onChange={onContact}
          onCreate={onCreateContact}
          emptyValue="__none__"
          placeholder={m.prop_combobox_contact_placeholder()}
          searchPlaceholder={m.prop_combobox_contact_search()}
          noResultLabel={m.prop_combobox_contact_empty()}
          createLabel={m.prop_combobox_contact_create()}
        />
      )}

      <Button type="button" onClick={onAdd} disabled={adding}>
        {adding ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        {m.prop_add_recipient()}
      </Button>
    </div>
  )
}
