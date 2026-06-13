import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  AlertTriangle,
  Building2,
  Plus,
  Search,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import { PageToolbar } from '~/components/app/page-toolbar'
import { CompanyCard } from '~/components/companies/company-card'
import { CompanyFormDialog } from '~/components/companies/company-form-dialog'
import { ContactFormDialog } from '~/components/companies/contact-form-dialog'
import { DeleteConfirmDialog } from '~/components/companies/delete-confirm-dialog'

export const Route = createFileRoute('/app/entreprises')({
  component: EntreprisesPage,
  head: () => ({ meta: [{ title: 'Entreprises · Filon' }] }),
})

type Company = Doc<'companies'>
type Contact = Doc<'contacts'>

function EntreprisesPage() {
  const [search, setSearch] = useState('')
  const searchTerm = search.trim()

  const companies = useQuery(
    api.companies.list,
    searchTerm ? { search: searchTerm } : {},
  )
  const opportunityCounts = useQuery(
    api.contacts.countOpportunitiesByCompany,
    {},
  )

  const removeCompany = useMutation(api.companies.remove)
  const removeContact = useMutation(api.contacts.remove)

  // Dialogs : entreprise (create/edit), contact (create/edit), suppressions.
  const [companyDialog, setCompanyDialog] = useState<{
    open: boolean
    company: Company | null
  }>({ open: false, company: null })
  const [contactDialog, setContactDialog] = useState<{
    open: boolean
    contact: Contact | null
    defaultCompanyId?: Id<'companies'>
  }>({ open: false, contact: null })
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)

  const countOf = useMemo(
    () => (id: Id<'companies'>) => opportunityCounts?.[id] ?? 0,
    [opportunityCounts],
  )

  function openCreateCompany() {
    setCompanyDialog({ open: true, company: null })
  }
  function openEditCompany(company: Company) {
    setCompanyDialog({ open: true, company })
  }
  function openAddContact(companyId: Id<'companies'>) {
    setContactDialog({ open: true, contact: null, defaultCompanyId: companyId })
  }
  function openEditContact(contact: Contact) {
    setContactDialog({ open: true, contact })
  }

  async function confirmDeleteCompany() {
    if (!companyToDelete) return
    try {
      await removeCompany({ id: companyToDelete._id })
      toast.success('Entreprise supprimee.')
    } catch {
      toast.error('La suppression a echoue.')
    }
  }

  async function confirmDeleteContact() {
    if (!contactToDelete) return
    try {
      await removeContact({ id: contactToDelete._id })
      toast.success('Contact supprime.')
    } catch {
      toast.error('La suppression a echoue.')
    }
  }

  // L'objet companies est `undefined` tant que la requete charge. On distingue
  // le chargement (skeleton) de l'etat vide (pas de resultat).
  const isLoading = companies === undefined
  const isEmpty = companies !== undefined && companies.length === 0
  const hasSearch = searchTerm.length > 0
  // companies n'est jamais `null` (la query throw ou retourne un tableau) ;
  // l'erreur reseau est portee par les toasts d'action. On garde toutefois un
  // garde-fou visuel via le bloc error si un jour la query renvoie null.

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Entreprises"
        subtitle="Vos entreprises ciblées et leurs contacts, reliés à vos opportunités."
        actions={
          <Button onClick={openCreateCompany}>
            <Plus className="size-4" />
            Ajouter une entreprise
          </Button>
        }
        sticky
      >
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une entreprise, un secteur, une ville..."
            className="h-11 pl-9"
            aria-label="Rechercher une entreprise"
          />
        </div>
      </PageToolbar>

      {isLoading ? (
        <LoadingState />
      ) : isEmpty ? (
        <EmptyState hasSearch={hasSearch} onAdd={openCreateCompany} />
      ) : (
        <div className="grid gap-3">
          {companies.map((company) => (
            <CompanyCard
              key={company._id}
              company={company}
              opportunityCount={countOf(company._id)}
              onEdit={openEditCompany}
              onDelete={setCompanyToDelete}
              onAddContact={openAddContact}
              onEditContact={openEditContact}
              onDeleteContact={setContactToDelete}
            />
          ))}
        </div>
      )}

      <CompanyFormDialog
        open={companyDialog.open}
        onOpenChange={(open) =>
          setCompanyDialog((s) => ({ ...s, open }))
        }
        company={companyDialog.company}
      />

      <ContactFormDialog
        open={contactDialog.open}
        onOpenChange={(open) =>
          setContactDialog((s) => ({ ...s, open }))
        }
        contact={contactDialog.contact}
        companies={companies ?? []}
        defaultCompanyId={contactDialog.defaultCompanyId}
      />

      <DeleteConfirmDialog
        open={Boolean(companyToDelete)}
        onOpenChange={(open) => !open && setCompanyToDelete(null)}
        title="Supprimer cette entreprise ?"
        description={
          companyToDelete
            ? `« ${companyToDelete.name} » sera supprimee. Ses contacts et opportunites lies ne seront pas supprimes mais detaches de cette entreprise.`
            : ''
        }
        onConfirm={confirmDeleteCompany}
      />

      <DeleteConfirmDialog
        open={Boolean(contactToDelete)}
        onOpenChange={(open) => !open && setContactToDelete(null)}
        title="Supprimer ce contact ?"
        description={
          contactToDelete
            ? `« ${contactToDelete.name} » sera supprime. Les opportunites liees seront detachees de ce contact.`
            : ''
        }
        onConfirm={confirmDeleteContact}
      />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-[var(--radius)]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  hasSearch,
  onAdd,
}: {
  hasSearch: boolean
  onAdd: () => void
}) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
          <Search className="size-5" />
        </span>
        <p className="mt-4 text-sm text-fg-muted">
          Aucun resultat pour cette recherche.
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Building2 className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-fg">
        Aucune entreprise enregistree.
      </h2>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        Ajoutez les entreprises que vous ciblez pour relier vos contacts et vos
        opportunites au meme endroit.
      </p>
      <Button className="mt-5" onClick={onAdd}>
        <Plus className="size-4" />
        Ajouter une entreprise
      </Button>
    </div>
  )
}

/** Bloc d'erreur reutilisable (reserve si une query renvoie un etat d'echec). */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-danger/40 bg-danger-soft px-4 py-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="text-sm font-medium text-danger">
          Le chargement des entreprises a echoue.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Reessayer
        </Button>
      </div>
    </div>
  )
}
