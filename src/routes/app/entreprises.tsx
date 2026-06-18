import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  Plus,
  Search,
  User,
  Users,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { PageToolbar } from '~/components/app/page-toolbar'
import { ExportButton } from '~/components/billing/export-button'
import { CONTACT_COLUMNS } from '~/lib/export'
import { CompanyCard } from '~/components/companies/company-card'
import { ParticularCard } from '~/components/companies/particular-card'
import { CompanyFormDialog } from '~/components/companies/company-form-dialog'
import { ContactFormDialog } from '~/components/companies/contact-form-dialog'
import { DeleteConfirmDialog } from '~/components/companies/delete-confirm-dialog'
import {
  CarnetSegments,
  type CarnetSegment,
} from '~/components/companies/carnet-segments'

type EntreprisesSearch = { q?: string }

export const Route = createFileRoute('/app/entreprises')({
  component: EntreprisesPage,
  head: () => ({ meta: [{ title: 'Carnet · Filon' }] }),
  // `q` permet d'arriver depuis la palette de commandes pre-filtre sur un nom.
  validateSearch: (search: Record<string, unknown>): EntreprisesSearch => {
    const q = typeof search.q === 'string' ? search.q : undefined
    return q ? { q } : {}
  },
})

type Company = Doc<'companies'>
type Contact = Doc<'contacts'> & { companyName?: string }

function EntreprisesPage() {
  const { q } = Route.useSearch()
  const [search, setSearch] = useState(q ?? '')
  const searchTerm = search.trim()
  const [segment, setSegment] = useState<CarnetSegment>('all')

  // Resynchronise la recherche quand on arrive (ou re-arrive) via la palette
  // avec un nouveau `q` ; n'ecrase pas une saisie manuelle ulterieure.
  useEffect(() => {
    if (q) setSearch(q)
  }, [q])

  const companies = useQuery(
    api.companies.list,
    searchTerm ? { search: searchTerm } : {},
  )
  // Tous les contacts du user. Les particuliers = ceux sans entreprise.
  const allContacts = useQuery(
    api.contacts.list,
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

  const particuliers = useMemo(
    () => (allContacts ?? []).filter((c) => !c.companyId),
    [allContacts],
  )

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
  function openCreateParticular() {
    setContactDialog({ open: true, contact: null })
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
      toast.success('Particulier supprime.')
    } catch {
      toast.error('La suppression a echoue.')
    }
  }

  const isLoading = companies === undefined || allContacts === undefined
  const companyCount = companies?.length ?? 0
  const particularCount = particuliers.length
  const totalCount = companyCount + particularCount
  const hasSearch = searchTerm.length > 0

  const showCompanies = segment !== 'people'
  const showParticulars = segment !== 'companies'

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Carnet"
        subtitle="Vos entreprises ciblées et les particuliers que vous suivez, reliés à vos opportunités et à vos documents."
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              base="carnet"
              rows={allContacts ?? []}
              columns={CONTACT_COLUMNS}
            />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Ajouter
                <ChevronDown className="size-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={openCreateCompany}>
                <Building2 className="size-4" />
                Une entreprise
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={openCreateParticular}>
                <User className="size-4" />
                Un particulier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        }
        sticky
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une entreprise, une personne, une ville..."
              className="h-11 pl-9"
              aria-label="Rechercher dans le carnet"
            />
          </div>
          <CarnetSegments
            value={segment}
            onChange={setSegment}
            counts={{
              all: totalCount,
              companies: companyCount,
              people: particularCount,
            }}
          />
        </div>
      </PageToolbar>

      {isLoading ? (
        <LoadingState />
      ) : totalCount === 0 ? (
        <EmptyState
          hasSearch={hasSearch}
          onAddCompany={openCreateCompany}
          onAddParticular={openCreateParticular}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {showCompanies && (
            <SegmentBlock
              show={segment === 'all'}
              icon={<Building2 className="size-4 text-fg-subtle" />}
              label="Entreprises"
              count={companyCount}
              empty={
                hasSearch
                  ? 'Aucune entreprise pour cette recherche.'
                  : 'Aucune entreprise enregistrée.'
              }
              isEmpty={companyCount === 0}
            >
              {companies!.map((company) => (
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
            </SegmentBlock>
          )}

          {showParticulars && (
            <SegmentBlock
              show={segment === 'all'}
              icon={<User className="size-4 text-fg-subtle" />}
              label="Particuliers"
              count={particularCount}
              empty={
                hasSearch
                  ? 'Aucun particulier pour cette recherche.'
                  : 'Aucun particulier suivi pour l’instant.'
              }
              isEmpty={particularCount === 0}
            >
              {particuliers.map((contact) => (
                <ParticularCard
                  key={contact._id}
                  contact={contact}
                  onEdit={openEditContact}
                  onDelete={setContactToDelete}
                />
              ))}
            </SegmentBlock>
          )}
        </div>
      )}

      <CompanyFormDialog
        open={companyDialog.open}
        onOpenChange={(open) => setCompanyDialog((s) => ({ ...s, open }))}
        company={companyDialog.company}
      />

      <ContactFormDialog
        open={contactDialog.open}
        onOpenChange={(open) => setContactDialog((s) => ({ ...s, open }))}
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

/**
 * Section d'un segment du carnet (Entreprises ou Particuliers). En vue « Tout »,
 * affiche un en-tete de groupe. En vue filtree (un seul segment), on masque
 * l'en-tete redondant via `show`.
 */
function SegmentBlock({
  show,
  icon,
  label,
  count,
  empty,
  isEmpty,
  children,
}: {
  show: boolean
  icon: React.ReactNode
  label: string
  count: number
  empty: string
  isEmpty: boolean
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      {show && (
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-fg">{label}</h2>
          <span className="rounded-full bg-surface-2 px-1.5 text-xs font-medium tabular-nums text-fg-subtle">
            {count}
          </span>
        </div>
      )}
      {isEmpty ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-2/40 px-6 py-10 text-center">
          <p className="text-sm text-fg-muted">{empty}</p>
        </div>
      ) : (
        <div className="grid gap-3">{children}</div>
      )}
    </section>
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
  onAddCompany,
  onAddParticular,
}: {
  hasSearch: boolean
  onAddCompany: () => void
  onAddParticular: () => void
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
        <Users className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-fg">
        Votre carnet est vide.
      </h2>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        Ajoutez les entreprises que vous ciblez et les particuliers que vous
        suivez (prospects, relations, parrainages) pour tout relier au meme
        endroit.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onAddCompany}>
          <Building2 className="size-4" />
          Ajouter une entreprise
        </Button>
        <Button variant="outline" onClick={onAddParticular}>
          <User className="size-4" />
          Ajouter un particulier
        </Button>
      </div>
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
          Le chargement du carnet a echoue.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Reessayer
        </Button>
      </div>
    </div>
  )
}
