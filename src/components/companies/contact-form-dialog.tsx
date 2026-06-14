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
import { toast } from '~/components/ui/sonner'

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
      toast.success('Entreprise creee.')
      return id as string
    } catch {
      toast.error("L'entreprise n'a pas pu etre creee.")
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
    notes: '',
  })
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
      notes: contact?.notes ?? '',
    })
  }, [open, contact, defaultCompanyId])

  function field<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError('Le nom du contact est requis.')
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
          notes: string
        } = {
          id: contact._id,
          name,
          role: form.role.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          linkedin: form.linkedin.trim(),
          notes: form.notes.trim(),
        }
        if (companyId) args.companyId = companyId
        await updateContact(args)
        toast.success('Modifications enregistrees.')
      } else {
        const args: {
          name: string
          companyId?: Id<'companies'>
          role?: string
          email?: string
          phone?: string
          linkedin?: string
          notes?: string
        } = { name }
        if (companyId) args.companyId = companyId
        if (form.role.trim()) args.role = form.role.trim()
        if (form.email.trim()) args.email = form.email.trim()
        if (form.phone.trim()) args.phone = form.phone.trim()
        if (form.linkedin.trim()) args.linkedin = form.linkedin.trim()
        if (form.notes.trim()) args.notes = form.notes.trim()
        await createContact(args)
        toast.success('Contact ajoute.')
      }
      onOpenChange(false)
    } catch {
      toast.error(
        isEdit
          ? "Les modifications n'ont pas pu etre enregistrees."
          : "Impossible d'ajouter le contact.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier le contact' : 'Ajouter un contact'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Mettez a jour les coordonnees de ce contact.'
              : 'Enregistrez un interlocuteur, eventuellement rattache a une entreprise.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="contact-name">Nom</Label>
            <Input
              id="contact-name"
              value={form.name}
              onChange={field('name')}
              placeholder="Prenom et nom"
              aria-invalid={Boolean(error)}
              autoFocus
            />
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contact-company">Entreprise</Label>
              <EntityCombobox
                id="contact-company"
                items={companies.map((c) => ({ value: c._id, label: c.name }))}
                value={form.companyId}
                onChange={(v) => setForm((f) => ({ ...f, companyId: v }))}
                onCreate={handleCreateCompany}
                emptyValue={NO_COMPANY}
                emptyLabel="Sans entreprise"
                placeholder="Rattacher une entreprise"
                searchPlaceholder="Rechercher ou creer une entreprise..."
                noResultLabel="Aucune entreprise trouvee."
                createLabel="Creer l'entreprise"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-role">Role</Label>
              <Input
                id="contact-role"
                value={form.role}
                onChange={field('role')}
                placeholder="Ex. CTO, recruteuse"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contact-email">E-mail</Label>
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
              <Label htmlFor="contact-phone">Telephone</Label>
              <Input
                id="contact-phone"
                value={form.phone}
                onChange={field('phone')}
                placeholder="+225 ..."
                inputMode="tel"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contact-linkedin">LinkedIn</Label>
            <Input
              id="contact-linkedin"
              value={form.linkedin}
              onChange={field('linkedin')}
              placeholder="https://linkedin.com/in/..."
              inputMode="url"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contact-notes">Notes</Label>
            <Textarea
              id="contact-notes"
              value={form.notes}
              onChange={field('notes')}
              placeholder="Details, contexte, points a suivre"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
