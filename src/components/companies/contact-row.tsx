import { Link2, Mail, Pencil, Phone, Trash2 } from 'lucide-react'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { m } from '~/lib/paraglide/messages'

type Contact = Doc<'contacts'> & { companyName?: string }

export function ContactRow({
  contact,
  onEdit,
  onDelete,
  showCompany,
}: {
  contact: Contact
  onEdit: (contact: Contact) => void
  onDelete: (contact: Contact) => void
  /** Affiche le nom de l'entreprise (vue contacts globale, pas dans une fiche). */
  showCompany?: boolean
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-fg-muted">
        {initials(contact.name)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="truncate text-sm font-medium text-fg">
            {contact.name}
          </span>
          {contact.role && (
            <span className="truncate text-xs text-fg-subtle">
              {contact.role}
            </span>
          )}
        </div>

        {showCompany && contact.companyName && (
          <p className="mt-0.5 truncate text-xs text-fg-muted">
            {contact.companyName}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-accent"
            >
              <Mail className="size-3.5 text-fg-subtle" />
              <span className="truncate">{contact.email}</span>
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-accent"
            >
              <Phone className="size-3.5 text-fg-subtle" />
              {contact.phone}
            </a>
          )}
          {contact.linkedin && (
            <a
              href={normalizeLinkedin(contact.linkedin)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-accent"
            >
              <Link2 className="size-3.5 text-fg-subtle" />
              LinkedIn
            </a>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.carnet_contact_edit_aria()}
          onClick={() => onEdit(contact)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.carnet_contact_delete_aria()}
          className="text-fg-muted hover:text-danger"
          onClick={() => onDelete(contact)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function normalizeLinkedin(raw: string) {
  const trimmed = raw.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
