import { useState } from 'react'
import type { FunctionReturnType } from 'convex/server'
import { Building2, CalendarClock, Coins } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { ProposalFormDialog } from '../proposal-form-dialog'
import { ProposalDetailActions } from '../proposal-detail-actions'
import { ProposalFollowupsPanel } from '../proposal-followups-panel'
import { DetailPanel } from '../detail-panel'
import {
  formatAmount,
  formatDate,
  STATUS_BADGE,
  STATUS_HINT,
  STATUS_LABELS,
  type ProposalStatus,
} from '../proposal-status'

type LoadedProposal = FunctionReturnType<typeof api.proposals.get>

/**
 * Contenu central du détail d'une proposition, partagé par le panneau split
 * (desktop), la feuille plein écran (mobile) et la route dédiée `$id`.
 *
 * `onRemoved` est appelé après une suppression réussie pour que l'hôte ferme
 * le panneau / redirige. `layout` adapte la grille : `pane` empile en une
 * colonne (zone étroite), `page` garde la grille 2/3 + 1/3.
 */
export function ProposalDetailContent({
  proposal,
  layout = 'pane',
}: {
  proposal: LoadedProposal
  layout?: 'pane' | 'page'
}) {
  const [editOpen, setEditOpen] = useState(false)

  const status = proposal.status as ProposalStatus
  const amount = formatAmount(proposal.amount, proposal.currency)
  const sentAt = formatDate(proposal.sentAt)
  const { company } = proposal
  // Le dialog d'édition attend un Doc<'proposals'> sans le champ `company` résolu.
  const { company: _company, ...proposalDoc } = proposal

  const isPage = layout === 'page'

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Badge variant={STATUS_BADGE[status]} className="shrink-0">
              {STATUS_LABELS[status]}
            </Badge>
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-fg sm:text-2xl">
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
            <span className="assay inline-flex items-center gap-1.5">
              <Coins className="size-4 text-fg-subtle" />
              {amount}
            </span>
          )}
          {sentAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4 text-fg-subtle" />
              Envoyée le <span className="assay">{sentAt}</span>
            </span>
          )}
        </div>
      </header>

      <div
        className={
          isPage ? 'grid grid-cols-1 gap-5 lg:grid-cols-3' : 'flex flex-col gap-5'
        }
      >
        <section className={isPage ? 'lg:col-span-2' : ''}>
          <DetailPanel title="Pitch">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
              {proposal.pitch}
            </p>
          </DetailPanel>
        </section>

        <aside className="flex flex-col gap-5">
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
