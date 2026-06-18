import { useState } from 'react'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { toast } from '~/components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { ActivityTimeline } from '../activity-timeline'
import { OpportunityForm, type OpportunityFormSubmit } from '../opportunity-form'
import { buildUpdateArgs } from '../update-args'
import { STAGE_META, type Stage } from '../meta'
import { EntityDocuments } from '~/components/shared/entity-documents'
import { Panel } from './panel'
import { CompanyContactPanel, FollowupsPanel } from './panels'
import { DetailHeader } from './detail-header'
import { AiDraftTeaser } from './ai-draft-teaser'
import { AiSignalCard } from '../ai-signal-card'
import { UpgradeNudge } from '~/components/billing/upgrade-nudge'

type LoadedOpportunity = FunctionReturnType<typeof api.opportunities.get>

/**
 * Contenu central du détail d'une opportunité, partagé par le panneau split
 * (desktop), la feuille plein écran (mobile) et la route dédiée `$id`.
 *
 * `onRemoved` est appelé après une suppression réussie pour que l'hôte ferme
 * le panneau / redirige. `layout` adapte la grille : `pane` empile en une
 * colonne (zone étroite), `page` garde la grille 2/3 + 1/3.
 */
export function OpportunityDetailContent({
  opportunity,
  layout = 'pane',
  onRemoved,
}: {
  opportunity: LoadedOpportunity
  layout?: 'pane' | 'page'
  onRemoved?: () => void
}) {
  const setStage = useMutation(api.opportunities.setStage)
  const update = useMutation(api.opportunities.update)
  const remove = useMutation(api.opportunities.remove)

  const [editOpen, setEditOpen] = useState(false)
  const [editPending, setEditPending] = useState(false)
  const [removing, setRemoving] = useState(false)
  // Déclencheur de valeur mérité : opportunité passée à « Gagné » à l'instant.
  const [justWon, setJustWon] = useState(false)

  async function handleStage(next: Stage) {
    if (next === opportunity.stage) return
    try {
      await setStage({ id: opportunity._id, stage: next })
      toast.success(m.opp_moved_to({ stage: STAGE_META[next].label }))
      if (next === 'won') setJustWon(true)
    } catch {
      toast.error(m.opp_move_error())
    }
  }

  async function handleEdit(values: OpportunityFormSubmit) {
    setEditPending(true)
    try {
      await update(buildUpdateArgs(opportunity._id, values))
      toast.success(m.opp_changes_saved())
      setEditOpen(false)
    } catch {
      toast.error(m.opp_changes_save_error())
    } finally {
      setEditPending(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await remove({ id: opportunity._id })
      toast.success(m.opp_removed())
      onRemoved?.()
    } catch {
      toast.error(m.opp_delete_error())
      setRemoving(false)
    }
  }

  const isPage = layout === 'page'

  return (
    <div className="flex flex-col gap-5">
      <DetailHeader
        opportunity={opportunity}
        removing={removing}
        onEdit={() => setEditOpen(true)}
        onRemove={handleRemove}
        onStage={handleStage}
      />

      {justWon && <UpgradeNudge id="won_value" variant="value" />}

      <div
        className={
          isPage ? 'grid grid-cols-1 gap-5 lg:grid-cols-3' : 'flex flex-col gap-5'
        }
      >
        <section className={isPage ? 'lg:col-span-2' : ''}>
          <Panel title={m.opp_panel_activity()}>
            <ActivityTimeline opportunityId={opportunity._id} />
          </Panel>
        </section>

        <aside className="flex flex-col gap-5">
          {opportunity.description && (
            <Panel title={m.opp_panel_notes()}>
              <p className="whitespace-pre-wrap break-words text-sm text-fg">
                {opportunity.description}
              </p>
            </Panel>
          )}

          <AiSignalCard opportunityId={opportunity._id} />

          <AiDraftTeaser />

          <CompanyContactPanel
            company={opportunity.company}
            contact={opportunity.contact}
          />

          <FollowupsPanel
            opportunityId={opportunity._id}
            nextActionAt={opportunity.nextActionAt}
          />

          <Panel title={m.opp_panel_documents()}>
            <EntityDocuments
              entityType="opportunity"
              entityId={String(opportunity._id)}
            />
          </Panel>
        </aside>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{m.opp_edit_title()}</DialogTitle>
            <DialogDescription>
              {m.opp_edit_desc_header()}
            </DialogDescription>
          </DialogHeader>
          <OpportunityForm
            withStage={false}
            submitLabel={m.opp_save()}
            pending={editPending}
            onCancel={() => setEditOpen(false)}
            onSubmit={handleEdit}
            initial={{
              title: opportunity.title,
              type: opportunity.type,
              targetType: opportunity.effectiveTargetType,
              companyId: opportunity.companyId,
              contactId: opportunity.contactId,
              source: opportunity.source,
              sourceChannel: opportunity.sourceChannel,
              sourceDetail: opportunity.sourceDetail,
              url: opportunity.url,
              location: opportunity.location,
              compensation: opportunity.compensation,
              deadline: opportunity.deadline,
              nextActionAt: opportunity.nextActionAt,
              tags: opportunity.tags,
              description: opportunity.description,
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
