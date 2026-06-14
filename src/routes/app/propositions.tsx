import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Plus, Send } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { PageToolbar } from '~/components/app/page-toolbar'
import {
  DataTableToolbar,
  DataTableSkeleton,
  DataTableEmpty,
  type FilterChip,
} from '~/components/data-table'
import { ProposalsTable } from '~/components/proposals/proposals-table'
import { ProposalFormDialog } from '~/components/proposals/proposal-form-dialog'
import {
  PROPOSAL_STATUSES,
  STATUS_LABELS,
  type ProposalStatus,
} from '~/components/proposals/proposal-status'

export const Route = createFileRoute('/app/propositions')({
  component: PropositionsPage,
  head: () => ({ meta: [{ title: 'Filon · Propositions' }] }),
  // Ouverture directe du formulaire depuis la palette de commandes (?nouveau).
  validateSearch: (search: Record<string, unknown>): { nouveau?: boolean } =>
    search.nouveau ? { nouveau: true } : {},
})

type ProposalRow = Doc<'proposals'> & { companyName?: string }
type StatusFilter = 'all' | ProposalStatus

function PropositionsPage() {
  // Une seule requete : tout charger puis filtrer/rechercher cote client (le
  // volume de propositions par user reste modeste).
  const proposals = useQuery(api.proposals.list, {}) as ProposalRow[] | undefined

  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Doc<'proposals'> | null>(null)

  // Auto-ouverture du formulaire via la palette (?nouveau), nettoyee ensuite.
  const { nouveau } = Route.useSearch()
  const navigate = useNavigate()
  useEffect(() => {
    if (!nouveau) return
    setEditing(null)
    setDialogOpen(true)
    void navigate({ to: '/app/propositions', replace: true })
  }, [nouveau, navigate])

  const filtered = useMemo(() => {
    if (!proposals) return undefined
    const q = search.trim().toLowerCase()
    return proposals.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (q) {
        const haystack = `${p.title} ${p.companyName ?? ''} ${p.pitch}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [proposals, status, search])

  const chips = useMemo<FilterChip[]>(() => {
    const out: FilterChip[] = []
    if (status !== 'all') {
      out.push({
        key: 'status',
        label: `Statut : ${STATUS_LABELS[status]}`,
        onRemove: () => setStatus('all'),
      })
    }
    const s = search.trim()
    if (s) {
      out.push({ key: 'search', label: `« ${s} »`, onRemove: () => setSearch('') })
    }
    return out
  }, [status, search])

  function resetFilters() {
    setStatus('all')
    setSearch('')
  }

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(proposal: Doc<'proposals'>) {
    setEditing(proposal)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Propositions"
        subtitle="Suivez vos propositions spontanées et votre prospection, du brouillon à la signature."
        actions={
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="size-4" />
            Nouvelle proposition
          </Button>
        }
      >
        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher une proposition..."
          searchLabel="Rechercher une proposition"
          chips={chips}
          onClearAll={resetFilters}
        >
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="lg:w-44" aria-label="Filtrer par statut">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {PROPOSAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DataTableToolbar>
      </PageToolbar>

      <Content
        all={proposals}
        filtered={filtered}
        hasActiveFilters={chips.length > 0}
        onReset={resetFilters}
        onCreate={openCreate}
        onEdit={openEdit}
      />

      <ProposalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        proposal={editing}
      />
    </div>
  )
}

function Content({
  all,
  filtered,
  hasActiveFilters,
  onReset,
  onCreate,
  onEdit,
}: {
  all: ProposalRow[] | undefined
  filtered: ProposalRow[] | undefined
  hasActiveFilters: boolean
  onReset: () => void
  onCreate: () => void
  onEdit: (proposal: Doc<'proposals'>) => void
}) {
  if (all === undefined || filtered === undefined) {
    return <DataTableSkeleton />
  }

  // Etat vide global (aucune proposition du tout).
  if (all.length === 0) {
    return (
      <DataTableEmpty
        icon={Send}
        title="Aucune proposition pour l'instant"
        message="Démarchez les bonnes entreprises sans rien laisser filer. Créez votre première proposition spontanée pour la suivre jusqu'à la signature."
        action={
          <Button onClick={onCreate}>
            <Plus className="size-4" />
            Nouvelle proposition
          </Button>
        }
      />
    )
  }

  // Etat vide de filtre (aucun resultat).
  if (filtered.length === 0) {
    return (
      <DataTableEmpty
        icon={Send}
        title="Aucun résultat"
        message="Aucune proposition ne correspond à ces filtres."
        action={
          hasActiveFilters ? (
            <Button variant="outline" onClick={onReset}>
              Réinitialiser les filtres
            </Button>
          ) : undefined
        }
      />
    )
  }

  return <ProposalsTable items={filtered} onEdit={onEdit} />
}
