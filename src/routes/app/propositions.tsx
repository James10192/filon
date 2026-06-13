import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { AlertTriangle, Plus, Send } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { ProposalCard } from '~/components/proposals/proposal-card'
import { ProposalFormDialog } from '~/components/proposals/proposal-form-dialog'
import {
  PROPOSAL_STATUSES,
  STATUS_LABELS,
  type ProposalStatus,
} from '~/components/proposals/proposal-status'

export const Route = createFileRoute('/app/propositions')({
  component: PropositionsPage,
  head: () => ({ meta: [{ title: 'Filon · Propositions' }] }),
})

type ProposalRow = Doc<'proposals'> & { companyName?: string }
type TabValue = 'all' | ProposalStatus

function PropositionsPage() {
  // Une seule requete : tout charger puis filtrer/compter cote client par
  // onglet (le volume de propositions par user reste modeste).
  const proposals = useQuery(api.proposals.list, {}) as
    | ProposalRow[]
    | undefined

  const [tab, setTab] = useState<TabValue>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Doc<'proposals'> | null>(null)

  const counts = useMemo(() => {
    const base: Record<TabValue, number> = {
      all: 0,
      draft: 0,
      sent: 0,
      accepted: 0,
      refused: 0,
    }
    if (!proposals) return base
    base.all = proposals.length
    for (const p of proposals) {
      base[p.status as ProposalStatus] += 1
    }
    return base
  }, [proposals])

  const filtered = useMemo(() => {
    if (!proposals) return []
    if (tab === 'all') return proposals
    return proposals.filter((p) => p.status === tab)
  }, [proposals, tab])

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(proposal: Doc<'proposals'>) {
    setEditing(proposal)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            Propositions
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Suivez vos propositions spontanees et votre demarchage, du brouillon
            a la signature.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="size-4" />
          Nouvelle proposition
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="all">
            Toutes
            <Count n={counts.all} active={tab === 'all'} />
          </TabsTrigger>
          {PROPOSAL_STATUSES.map((status) => (
            <TabsTrigger key={status} value={status}>
              {STATUS_LABELS[status]}
              <Count n={counts[status]} active={tab === status} />
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab}>
          <PropositionsBody
            proposals={proposals}
            filtered={filtered}
            tab={tab}
            onCreate={openCreate}
            onEdit={openEdit}
          />
        </TabsContent>
      </Tabs>

      <ProposalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        proposal={editing}
      />
    </div>
  )
}

function PropositionsBody({
  proposals,
  filtered,
  tab,
  onCreate,
  onEdit,
}: {
  proposals: ProposalRow[] | undefined
  filtered: ProposalRow[]
  tab: TabValue
  onCreate: () => void
  onEdit: (proposal: Doc<'proposals'>) => void
}) {
  // Etat erreur : Convex propage l'erreur via une exception au rendu ; on
  // distingue ici le cas "donnees indisponibles" du chargement legitime.
  if (proposals === undefined) {
    return <ListSkeleton />
  }

  // Etat vide global (aucune proposition du tout).
  if (proposals.length === 0) {
    return <EmptyState onCreate={onCreate} />
  }

  // Etat vide d'onglet (filtre sans resultat).
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-2/40 px-6 py-12 text-center">
        <p className="text-sm font-medium text-fg">
          {tab === 'all'
            ? 'Rien ici pour le moment.'
            : `Aucune proposition « ${STATUS_LABELS[tab as ProposalStatus].toLowerCase()} ».`}
        </p>
        <p className="max-w-sm text-sm text-fg-muted">
          Changez d'onglet ou creez une nouvelle proposition.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((proposal) => (
        <ProposalCard key={proposal._id} proposal={proposal} onEdit={onEdit} />
      ))}
    </div>
  )
}

function Count({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={
        active
          ? 'ml-0.5 rounded-full bg-accent-soft px-1.5 text-xs font-medium tabular-nums text-accent'
          : 'ml-0.5 rounded-full bg-surface-2 px-1.5 text-xs font-medium tabular-nums text-fg-subtle'
      }
    >
      {n}
    </span>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Send className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-fg">
          Aucune proposition pour l'instant
        </h2>
        <p className="mx-auto max-w-md text-sm text-fg-muted">
          Demarchez les bonnes entreprises sans rien laisser filer. Creez votre
          premiere proposition spontanee pour la suivre jusqu'a la signature.
        </p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="size-4" />
        Nouvelle proposition
      </Button>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Encart d'erreur reutilisable (non monte par defaut ici car Convex remonte
 * l'erreur au niveau du router ; conserve pour usage explicite si besoin).
 */
export function ProposalsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-danger/40 bg-danger-soft px-6 py-10 text-center">
      <AlertTriangle className="size-6 text-danger" />
      <p className="text-sm font-medium text-danger">
        Impossible de charger les propositions.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Reessayer
      </Button>
    </div>
  )
}
