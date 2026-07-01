import { useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { Loader2, Mail, MessageCircle, RefreshCw } from 'lucide-react'
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
import { ProposalFormDialog } from '~/components/proposals/proposal-form-dialog'
import { ActivityTimeline } from '../activity-timeline'
import { OpportunityForm, type OpportunityFormSubmit } from '../opportunity-form'
import { buildUpdateArgs } from '../update-args'
import { PRIORITY_META, type Priority, type Stage } from '../meta'
import { useStageLabels } from '../use-stage-labels'
import { EntityDocuments } from '~/components/shared/entity-documents'
import { Panel } from './panel'
import { CompanyContactPanel, FollowupsPanel } from './panels'
import { DetailHeader } from './detail-header'
import { AiDraftTeaser } from './ai-draft-teaser'
import { AiSignalCard } from '../ai-signal-card'
import { UpgradeNudge } from '~/components/billing/upgrade-nudge'
import { MailPulseRecoveryDialog } from '~/components/mailpulse/mailpulse-recovery-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'

type LoadedOpportunity = FunctionReturnType<typeof api.opportunities.get>
type RecoverySettings = {
  mailpulsePromptOnWon?: boolean
}

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
  const setPriority = useMutation(api.opportunities.setPriority)
  const update = useMutation(api.opportunities.update)
  const remove = useMutation(api.opportunities.remove)
  const markRecoveryPrompted = useMutation(api.recovery.markPrompted)
  const syncMailpulseRecoveryStatus = useAction(
    api.recovery.syncMailpulseRecoveryStatus,
  )
  const settings = useQuery(api.settings.get, {}) as RecoverySettings | undefined
  const { label: stageLabelOf } = useStageLabels()

  const [editOpen, setEditOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [editPending, setEditPending] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [syncingMailpulse, setSyncingMailpulse] = useState(false)
  // Déclencheur de valeur mérité : opportunité passée à « Gagné » à l'instant.
  const [justWon, setJustWon] = useState(false)
  const [mailpulseDialogOpen, setMailpulseDialogOpen] = useState(false)

  async function handleStage(next: Stage) {
    if (next === opportunity.stage) return
    try {
      await setStage({ id: opportunity._id, stage: next })
      toast.success(m.opp_moved_to({ stage: stageLabelOf(next) }))
      if (next === 'won') {
        setJustWon(true)
        const shouldPrompt = settings?.mailpulsePromptOnWon ?? true
        if (shouldPrompt && opportunity.recoveryStatus === undefined) {
          try {
            await markRecoveryPrompted({ opportunityId: opportunity._id })
            setMailpulseDialogOpen(true)
          } catch {
            toast.error("Le rappel MailPulse n'a pas pu etre prepare")
          }
        }
      }
    } catch {
      toast.error(m.opp_move_error())
    }
  }

  async function handlePriority(next: Priority) {
    if (next === opportunity.priority) return
    try {
      await setPriority({ id: opportunity._id, priority: next })
      toast.success(
        m.opp_priority_changed({ priority: PRIORITY_META[next].label }),
      )
    } catch {
      toast.error(m.opp_priority_change_error())
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

  async function handleMailpulseSync() {
    setSyncingMailpulse(true)
    try {
      await syncMailpulseRecoveryStatus({ opportunityId: opportunity._id })
      toast.success('Statut MailPulse synchronise')
    } catch {
      toast.error('Impossible de synchroniser MailPulse')
    } finally {
      setSyncingMailpulse(false)
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
        onCreateDocument={() => setProposalOpen(true)}
        onStage={handleStage}
        onPriority={handlePriority}
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

          {opportunity.recoveryStatus?.startsWith('mailpulse_') && (
            <MailPulseRecoveryPanel
              status={opportunity.recoveryStatus}
              contactId={opportunity.mailpulseContactId}
              sequenceId={opportunity.mailpulseSequenceId}
              lastSyncAt={opportunity.mailpulseLastSyncAt}
              syncing={syncingMailpulse}
              onSync={handleMailpulseSync}
            />
          )}

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
              priority: opportunity.priority,
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

      <ProposalFormDialog
        open={proposalOpen}
        onOpenChange={setProposalOpen}
        proposal={null}
        initialDraft={{
          title: opportunity.title,
          pitch: opportunity.description ?? '',
          kind: 'proforma',
        }}
        initialRecipient={
          opportunity.effectiveTargetType === 'company' && opportunity.companyId
            ? {
                targetType: 'company',
                companyId: opportunity.companyId,
                opportunityId: opportunity._id,
              }
            : opportunity.effectiveTargetType === 'person' && opportunity.contactId
              ? {
                  targetType: 'person',
                  contactId: opportunity.contactId,
                  opportunityId: opportunity._id,
                }
              : null
        }
      />

      <MailPulseRecoveryDialog
        open={mailpulseDialogOpen}
        onOpenChange={setMailpulseDialogOpen}
        opportunityId={opportunity._id}
      />
    </div>
  )
}

function MailPulseRecoveryPanel({
  status,
  contactId,
  sequenceId,
  lastSyncAt,
  syncing,
  onSync,
}: {
  status: string
  contactId?: string
  sequenceId?: string
  lastSyncAt?: number
  syncing: boolean
  onSync: () => void
}) {
  const active = status === 'mailpulse_active'
  return (
    <Panel
      title="Recouvrement MailPulse"
      action={
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Sync
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={active ? 'success' : 'warning'}>
            {active ? 'Actif' : 'Prepare'}
          </Badge>
          <Badge variant="accent">
            <Mail className="size-3" />
            Email
          </Badge>
          <Badge variant="success">
            <MessageCircle className="size-3" />
            WhatsApp
          </Badge>
        </div>
        <dl className="grid gap-2 text-xs text-fg-muted">
          {contactId && (
            <div className="flex justify-between gap-3">
              <dt>Contact MailPulse</dt>
              <dd className="truncate font-mono text-fg">{contactId}</dd>
            </div>
          )}
          {sequenceId && (
            <div className="flex justify-between gap-3">
              <dt>Sequence</dt>
              <dd className="truncate font-mono text-fg">{sequenceId}</dd>
            </div>
          )}
          {lastSyncAt && (
            <div className="flex justify-between gap-3">
              <dt>Derniere sync</dt>
              <dd className="text-fg">
                {new Date(lastSyncAt).toLocaleString('fr-FR')}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Panel>
  )
}
