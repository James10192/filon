import { useState } from 'react'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../../convex/_generated/api'
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
import { STAGE_META, type Stage } from '../meta'
import { Panel } from './panel'
import {
  CompanyContactPanel,
  FollowupsPanel,
  AttachedDocumentsPanel,
} from './panels'
import { DetailHeader } from './detail-header'

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

  async function handleStage(next: Stage) {
    if (next === opportunity.stage) return
    try {
      await setStage({ id: opportunity._id, stage: next })
      toast.success(`Opportunité déplacée vers « ${STAGE_META[next].label} ».`)
    } catch {
      toast.error('Le déplacement a échoué.')
    }
  }

  async function handleEdit(values: OpportunityFormSubmit) {
    setEditPending(true)
    try {
      const args: Record<string, unknown> = {
        id: opportunity._id,
        title: values.title,
        type: values.type,
        tags: values.tags,
        source: values.source ?? '',
        url: values.url ?? '',
        location: values.location ?? '',
        compensation: values.compensation ?? '',
        description: values.description ?? '',
      }
      if (values.deadline) args.deadline = values.deadline
      if (values.nextActionAt) args.nextActionAt = values.nextActionAt
      await update(args as Parameters<typeof update>[0])
      toast.success('Modifications enregistrées.')
      setEditOpen(false)
    } catch {
      toast.error("Les modifications n'ont pas pu être enregistrées.")
    } finally {
      setEditPending(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await remove({ id: opportunity._id })
      toast.success('Opportunité supprimée.')
      onRemoved?.()
    } catch {
      toast.error('La suppression a échoué.')
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

      <div
        className={
          isPage ? 'grid grid-cols-1 gap-5 lg:grid-cols-3' : 'flex flex-col gap-5'
        }
      >
        <section className={isPage ? 'lg:col-span-2' : ''}>
          <Panel title="Activité">
            <ActivityTimeline opportunityId={opportunity._id} />
          </Panel>
        </section>

        <aside className="flex flex-col gap-5">
          {opportunity.description && (
            <Panel title="Notes">
              <p className="whitespace-pre-wrap break-words text-sm text-fg">
                {opportunity.description}
              </p>
            </Panel>
          )}

          <CompanyContactPanel
            company={opportunity.company}
            contact={opportunity.contact}
          />

          <FollowupsPanel
            opportunityId={opportunity._id}
            nextActionAt={opportunity.nextActionAt}
          />

          <AttachedDocumentsPanel opportunityId={opportunity._id} />
        </aside>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l'opportunité</DialogTitle>
            <DialogDescription>
              L'étape se change depuis l'en-tête de l'opportunité.
            </DialogDescription>
          </DialogHeader>
          <OpportunityForm
            withStage={false}
            submitLabel="Enregistrer"
            pending={editPending}
            onCancel={() => setEditOpen(false)}
            onSubmit={handleEdit}
            initial={{
              title: opportunity.title,
              type: opportunity.type,
              source: opportunity.source,
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
