import { useState } from 'react'
import { useQuery } from 'convex/react'
import {
  Building2,
  ChevronDown,
  Globe,
  MapPin,
  Pencil,
  Plus,
  Target,
  Trash2,
  Users,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'
import { m } from '~/lib/paraglide/messages'
import { EntityDocuments } from '~/components/shared/entity-documents'
import { ContactRow } from './contact-row'

type Company = Doc<'companies'>
type Contact = Doc<'contacts'>

export function CompanyCard({
  company,
  opportunityCount,
  onEdit,
  onDelete,
  onAddContact,
  onEditContact,
  onDeleteContact,
}: {
  company: Company
  opportunityCount: number
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
  onAddContact: (companyId: Id<'companies'>) => void
  onEditContact: (contact: Contact) => void
  onDeleteContact: (contact: Contact) => void
}) {
  const [expanded, setExpanded] = useState(false)
  // Charge les contacts uniquement quand l'accordeon est ouvert (economie de
  // requetes ; chaque fiche n'instancie sa subscription qu'au depliage).
  const contacts = useQuery(
    api.contacts.list,
    expanded ? { companyId: company._id } : 'skip',
  )

  const website = normalizeUrl(company.website)

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3 p-4 md:p-5">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <Building2 className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-fg">
              {company.name}
            </h3>
            {company.sector && (
              <Badge variant="outline">{company.sector}</Badge>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
            {company.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-fg-subtle" />
                {company.location}
              </span>
            )}
            {website && (
              <a
                href={website.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-fg-muted transition-colors hover:text-accent"
              >
                <Globe className="size-3.5 text-fg-subtle" />
                {website.label}
              </a>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Target className="size-3.5 text-fg-subtle" />
              {opportunityCount > 1
                ? m.carnet_opportunity_count_plural({ n: opportunityCount })
                : m.carnet_opportunity_count_one({ n: opportunityCount })}
            </span>
          </div>

          {company.notes && (
            <p className="mt-2.5 line-clamp-2 text-sm text-fg-muted">
              {company.notes}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.carnet_company_edit_aria()}
            onClick={() => onEdit(company)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.carnet_company_delete_aria()}
            className="text-fg-muted hover:text-danger"
            onClick={() => onDelete(company)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Barre d'accordeon contacts */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex h-11 w-full items-center gap-2 px-4 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg md:px-5"
        >
          <Users className="size-4 text-fg-subtle" />
          <span>{m.carnet_contacts_label()}</span>
          <ChevronDown
            className={cn(
              'ml-auto size-4 text-fg-subtle transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {expanded && (
          <div className="px-4 pb-4 md:px-5 md:pb-5">
            {contacts === undefined ? (
              <div className="grid gap-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface-2/50 px-4 py-6 text-center">
                <p className="text-sm text-fg-muted">
                  {m.carnet_no_contact_for_company()}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onAddContact(company._id)}
                >
                  <Plus className="size-4" />
                  {m.carnet_add_contact()}
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                {contacts.map((contact) => (
                  <ContactRow
                    key={contact._id}
                    contact={contact}
                    onEdit={onEditContact}
                    onDelete={onDeleteContact}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 justify-start text-accent hover:text-accent"
                  onClick={() => onAddContact(company._id)}
                >
                  <Plus className="size-4" />
                  {m.carnet_add_contact()}
                </Button>
              </div>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <EntityDocuments
                entityType="company"
                entityId={String(company._id)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Normalise une URL pour l'affichage (label sans protocole) et le lien (href). */
function normalizeUrl(raw?: string): { href: string; label: string } | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const label = trimmed.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  return { href, label }
}
