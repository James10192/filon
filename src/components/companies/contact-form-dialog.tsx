import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
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
import { EntityCombobox } from '~/components/ui/entity-combobox'
import { TagCombobox } from '~/components/ui/tag-combobox'
import { toast } from '~/components/ui/sonner'
import { m } from '~/lib/paraglide/messages'

type Company = Doc<'companies'>
type Contact = Doc<'contacts'>

const NO_COMPANY = '__none__'

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  companies,
  defaultCompanyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si fourni, mode edition. Sinon, mode creation. */
  contact?: Contact | null
  companies: Company[]
  /** Entreprise preselectionnee (creation depuis une fiche entreprise). */
  defaultCompanyId?: Id<'companies'>
}) {
  const createContact = useMutation(api.contacts.create)
  const updateContact = useMutation(api.contacts.update)
  const createCompany = useMutation(api.companies.create)
  const isEdit = Boolean(contact)

  /** Cree une entreprise inline depuis le combobox et renvoie son id. */
  async function handleCreateCompany(name: string) {
    try {
      const id = await createCompany({ name })
      toast.success(m.carnet_company_created())
      return id as string
    } catch {
      toast.error(m.carnet_company_create_failed())
      return null
    }
  }

  const [form, setForm] = useState({
    name: '',
    companyId: NO_COMPANY as string,
    role: '',
    email: '',
    phone: '',
    linkedin: '',
    relationship: '',
    location: '',
    referredBy: '',
    notes: '',
  })
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm({
      name: contact?.name ?? '',
      companyId: contact?.companyId ?? defaultCompanyId ?? NO_COMPANY,
      role: contact?.role ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      linkedin: contact?.linkedin ?? '',
      relationship: contact?.relationship ?? '',
      location: contact?.location ?? '',
      referredBy: contact?.referredBy ?? '',
      notes: contact?.notes ?? '',
    })
    setTags(contact?.tags ?? [])
  }, [open, contact, defaultCompanyId])

  function field<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError(m.carnet_contact_name_required())
      return
    }
    setError(null)
    setBusy(true)

    const companyId =
      form.companyId !== NO_COMPANY
        ? (form.companyId as Id<'companies'>)
        : undefined

    try {
      if (isEdit && contact) {
        // En edition, le select non renseigne ne peut pas detacher via cette UI ;
        // on n'envoie companyId que s'il est defini (jamais `undefined` en arg).
        const args: {
          id: Id<'contacts'>
          name: string
          companyId?: Id<'companies'>
          role: string
          email: string
          phone: string
          linkedin: string
          relationship: string
          location: string
          referredBy: string
          notes: string
          tags: string[]
        } = {
          id: contact._id,
          name,
          role: form.role.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          linkedin: form.linkedin.trim(),
          relationship: form.relationship.trim(),
          location: form.location.trim(),
          referredBy: form.referredBy.trim(),
          notes: form.notes.trim(),
          tags,
        }
        if (companyId) args.companyId = companyId
        await updateContact(args)
        toast.success(m.carnet_changes_saved())
      } else {
        const args: {
          name: string
          companyId?: Id<'companies'>
          role?: string
          email?: string
          phone?: string
          linkedin?: string
          relationship?: string
          location?: string
          referredBy?: string
          notes?: string
          tags?: string[]
        } = { name }
        if (companyId) args.companyId = companyId
        if (form.role.trim()) args.role = form.role.trim()
        if (form.email.trim()) args.email = form.email.trim()
        if (form.phone.trim()) args.phone = form.phone.trim()
        if (form.linkedin.trim()) args.linkedin = form.linkedin.trim()
        if (form.relationship.trim()) args.relationship = form.relationship.trim()
        if (form.location.trim()) args.location = form.location.trim()
        if (form.referredBy.trim()) args.referredBy = form.referredBy.trim()
        if (form.notes.trim()) args.notes = form.notes.trim()
        if (tags.length > 0) args.tags = tags
        await createContact(args)
        toast.success(m.carnet_contact_added())
      }
      onOpenChange(false)
    } catch {
      toast.error(
        isEdit
          ? m.carnet_changes_save_failed()
          : m.carnet_contact_add_failed(),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? m.carnet_contact_dialog_title_edit()
              : m.carnet_contact_dialog_title_create()}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? m.carnet_contact_dialog_desc_edit()
              : m.carnet_contact_dialog_desc_create()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="contact-name">{m.carnet_field_name()}</Label>
            <Input
              id="contact-name"
              value={form.name}
              onChange={field('name')}
              placeholder={m.carnet_contact_name_placeholder()}
              aria-invalid={Boolean(error)}
              autoFocus
            />
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contact-company">
                {m.carnet_field_company()}
              </Label>
              <EntityCombobox
                id="contact-company"
                items={companies.map((c) => ({ value: c._id, label: c.name }))}
                value={form.companyId}
                onChange={(v) => setForm((f) => ({ ...f, companyId: v }))}
                onCreate={handleCreateCompany}
                emptyValue={NO_COMPANY}
                emptyLabel={m.carnet_no_company()}
                placeholder={m.carnet_attach_company()}
                searchPlaceholder={m.carnet_company_search_or_create()}
                noResultLabel={m.carnet_no_company_found()}
                createLabel={m.carnet_create_company()}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-role">{m.carnet_field_role()}</Label>
              <Input
                id="contact-role"
                value={form.role}
                onChange={field('role')}
                placeholder={m.carnet_role_placeholder()}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contact-email">{m.carnet_field_email()}</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={field('email')}
                placeholder="prenom@entreprise.com"
                inputMode="email"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-phone">{m.carnet_field_phone()}</Label>
              <Input
                id="contact-phone"
                value={form.phone}
                onChange={field('phone')}
                placeholder={m.carnet_phone_placeholder()}
                inputMode="tel"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contact-linkedin">{m.carnet_field_linkedin()}</Label>
            <Input
              id="contact-linkedin"
              value={form.linkedin}
              onChange={field('linkedin')}
              placeholder="https://linkedin.com/in/..."
              inputMode="url"
            />
          </div>

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contact-relationship">
                {m.carnet_field_relationship()}
              </Label>
              <Input
                id="contact-relationship"
                value={form.relationship}
                onChange={field('relationship')}
                placeholder={m.carnet_relationship_placeholder()}
              />
              <p className="text-xs text-fg-subtle">
                {m.carnet_relationship_hint()}
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-location">{m.carnet_field_place()}</Label>
              <Input
                id="contact-location"
                value={form.location}
                onChange={field('location')}
                placeholder={m.carnet_place_placeholder()}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contact-referred-by">
              {m.carnet_field_referred_by()}
            </Label>
            <Input
              id="contact-referred-by"
              value={form.referredBy}
              onChange={field('referredBy')}
              placeholder={m.carnet_referred_by_placeholder()}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contact-tags">{m.carnet_field_tags()}</Label>
            <TagCombobox id="contact-tags" value={tags} onChange={setTags} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contact-notes">{m.carnet_field_notes()}</Label>
            <Textarea
              id="contact-notes"
              value={form.notes}
              onChange={field('notes')}
              placeholder={m.carnet_notes_placeholder()}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {m.carnet_cancel()}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {m.carnet_save()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
