import { useState } from 'react'
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { ArrowLeft, Building2, CalendarClock, Coins } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { ProposalFormDialog } from '~/components/proposals/proposal-form-dialog'
import { ProposalDetailActions } from '~/components/proposals/proposal-detail-actions'
import { ProposalFollowupsPanel } from '~/components/proposals/proposal-followups-panel'
import { DetailPanel } from '~/components/proposals/detail-panel'
import {
  formatAmount,
  formatDate,
  STATUS_BADGE,
  STATUS_HINT,
  STATUS_LABELS,
  type ProposalStatus,
} from '~/components/proposals/proposal-status'

export const Route = createFileRoute('/app/propositions/$id')({
  component: PropositionDetailPage,
  // La query Convex throw « Introuvable » / « Non autorisé » : capté ici.
  errorComponent: () => <NotFoundRoute />,
  head: () => ({ meta: [{ title: 'Proposition · Filon' }] }),
})

type LoadedProposal = FunctionReturnType<typeof api.proposals.get>

function PropositionDetailPage() {
  const { id } = useParams({ from: '/app/propositions/$id' })
  const proposalId = id as Id<'proposals'>
  const proposal = useQuery(api.proposals.get, { id: proposalId })

  if (proposal === undefined) return <DetailSkeleton />
  return <DetailView proposal={proposal} />
}

function NotFoundRoute() {
  const navigate = useNavigate()
  return <NotFound onBack={() => navigate({ to: '/app/propositions' })} />
}

function DetailView({ proposal }: { proposal: LoadedProposal }) {
  const [editOpen, setEditOpen] = useState(false)

  const status = proposal.status as ProposalStatus
  const amount = formatAmount(proposal.amount, proposal.currency)
  const sentAt = formatDate(proposal.sentAt)

  // Le dialog d'édition attend un Doc<'proposals'> sans le champ `company` résolu.
  const { company, ...proposalDoc } = proposal

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/app/propositions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          Propositions
        </Link>
      </div>

      {/* En-tête */}
      <header className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Badge variant={STATUS_BADGE[status]} className="shrink-0">
              {STATUS_LABELS[status]}
            </Badge>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
              {proposal.title}
            </h1>
            <p className="text-sm text-fg-muted">{STATUS_HINT[status]}</p>
          </div>
          <ProposalDetailActions
            proposal={proposalDoc}
            onEdit={() => setEditOpen(true)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-sm text-fg-muted">
          {company ? (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4 text-fg-subtle" />
              {company.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-fg-subtle">
              <Building2 className="size-4" />
              Sans entreprise cible
            </span>
          )}
          {amount && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Coins className="size-4 text-fg-subtle" />
              {amount}
            </span>
          )}
          {sentAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4 text-fg-subtle" />
              Envoyée le {sentAt}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale : le pitch en entier */}
        <section className="lg:col-span-2">
          <DetailPanel title="Pitch">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
              {proposal.pitch}
            </p>
          </DetailPanel>
        </section>

        {/* Colonne latérale */}
        <aside className="flex flex-col gap-6">
          <CompanyPanel company={company} />
          <ProposalFollowupsPanel proposalId={proposal._id} />
        </aside>
      </div>

      <ProposalFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        proposal={proposalDoc}
      />
    </div>
  )
}

function CompanyPanel({ company }: { company: LoadedProposal['company'] }) {
  return (
    <DetailPanel title="Entreprise cible">
      {!company ? (
        <p className="text-sm text-fg-muted">
          Aucune entreprise rattachée à cette proposition.
        </p>
      ) : (
        <div className="flex items-start gap-2.5 text-sm">
          <Building2 className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
          <div className="min-w-0">
            <p className="font-medium text-fg">{company.name}</p>
            {company.sector && <p className="text-fg-muted">{company.sector}</p>}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent hover:underline"
              >
                {company.website}
              </a>
            )}
          </div>
        </div>
      )}
    </DetailPanel>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-32" />
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-44 w-full rounded-[var(--radius-lg)]" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  )
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-fg">Proposition introuvable</h1>
      <p className="text-sm text-fg-muted">
        Cette proposition n'existe pas ou ne vous appartient pas.
      </p>
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Retour aux propositions
      </Button>
    </div>
  )
}
