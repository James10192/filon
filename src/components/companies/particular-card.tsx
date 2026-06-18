import { useState } from 'react'
import {
  ChevronDown,
  Heart,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import { EntityDocuments } from '~/components/shared/entity-documents'

type Contact = Doc<'contacts'> & { companyName?: string }

/**
 * Fiche d'un particulier : un contact suivi directement, sans entreprise
 * (prospect P2P, relation, parrainage). Affiche relation, localisation,
 * etiquettes et coordonnees ; deplie un panneau avec les notes et les
 * documents rattaches (Documents 360).
 */
export function ParticularCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: Contact
  onEdit: (contact: Contact) => void
  onDelete: (contact: Contact) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const tags = contact.tags ?? []

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3 p-4 md:p-5">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-fg-muted">
          {initials(contact.name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-fg">
              {contact.name}
            </h3>
            <Badge variant="outline" className="gap-1">
              <User className="size-3" />
              Particulier
            </Badge>
            {contact.role && (
              <span className="truncate text-xs text-fg-subtle">
                {contact.role}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
            {contact.relationship && (
              <span className="inline-flex items-center gap-1.5">
                <Heart className="size-3.5 text-fg-subtle" />
                {contact.relationship}
              </span>
            )}
            {contact.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-fg-subtle" />
                {contact.location}
              </span>
            )}
          </div>

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

          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="h-5 px-1.5">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Modifier le particulier"
            onClick={() => onEdit(contact)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Supprimer le particulier"
            className="text-fg-muted hover:text-danger"
            onClick={() => onDelete(contact)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex h-11 w-full items-center gap-2 px-4 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg md:px-5"
        >
          <span>Détails et documents</span>
          <ChevronDown
            className={cn(
              'ml-auto size-4 text-fg-subtle transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {expanded && (
          <div className="flex flex-col gap-4 px-4 pb-4 md:px-5 md:pb-5">
            {contact.referredBy && (
              <p className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                <UserPlus className="size-3.5 text-fg-subtle" />
                Recommandé par {contact.referredBy}
              </p>
            )}
            {contact.notes && (
              <p className="whitespace-pre-wrap text-sm text-fg-muted">
                {contact.notes}
              </p>
            )}
            <EntityDocuments
              entityType="contact"
              entityId={String(contact._id)}
            />
          </div>
        )}
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
