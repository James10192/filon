import { useState } from 'react'
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Trash2,
  Building2,
  User,
  MapPin,
  Coins,
  CalendarClock,
  Loader2,
  FileText,
  Check,
  Plus,
  BellRing,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { ActivityTimeline } from '~/components/opportunities/activity-timeline'
import { StageChip, TypeChip, DueBadge } from '~/components/opportunities/chips'
import {
  OpportunityForm,
  type OpportunityFormSubmit,
} from '~/components/opportunities/opportunity-form'
import {
  STAGES,
  STAGE_META,
  formatDate,
  formatDateShort,
  type Stage,
} from '~/components/opportunities/meta'

export const Route = createFileRoute('/app/opportunites/$id')({
  component: OpportuniteDetailPage,
  // get() throw « Introuvable » / « Non autorisé » si l'opportunité n'est pas
  // au user : la query Convex relance l'erreur, captée par cet errorComponent.
  errorComponent: () => <NotFoundRoute />,
  head: () => ({ meta: [{ title: 'Opportunité · Filon' }] }),
})

function OpportuniteDetailPage() {
  const { id } = useParams({ from: '/app/opportunites/$id' })
  const opportunityId = id as Id<'opportunities'>

  const opportunity = useQuery(api.opportunities.get, { id: opportunityId })

  if (opportunity === undefined) return <DetailSkeleton />
  return <DetailView opportunity={opportunity} />
}

function NotFoundRoute() {
  const navigate = useNavigate()
  return <NotFound onBack={() => navigate({ to: '/app/opportunites' })} />
}

type LoadedOpportunity = FunctionReturnType<typeof api.opportunities.get>

function DetailView({ opportunity }: { opportunity: LoadedOpportunity }) {
  const navigate = useNavigate()
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
      // update() ne change pas le stage (cf. contrat). On force les champs définis.
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
      navigate({ to: '/app/opportunites' })
    } catch {
      toast.error('La suppression a échoué.')
      setRemoving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/app/opportunites"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          Opportunités
        </Link>
      </div>

      {/* En-tête */}
      <header className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <TypeChip type={opportunity.type} />
              <StageChip stage={opportunity.stage} />
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
              {opportunity.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
              Modifier
            </Button>
            <DeleteDialog onConfirm={handleRemove} pending={removing} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-muted">
          {opportunity.compensation && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Coins className="size-4 text-fg-subtle" />
              {opportunity.compensation}
            </span>
          )}
          {opportunity.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-fg-subtle" />
              {opportunity.location}
            </span>
          )}
          {opportunity.source && (
            <span className="inline-flex items-center gap-1.5">
              Source : {opportunity.source}
            </span>
          )}
          {opportunity.deadline && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4 text-fg-subtle" />
              Échéance {formatDate(opportunity.deadline)}
            </span>
          )}
          {opportunity.url && (
            <a
              href={opportunity.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
            >
              <ExternalLink className="size-4" />
              Voir l'offre
            </a>
          )}
        </div>

        {opportunity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {opportunity.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex h-6 items-center rounded-md bg-surface-2 px-2 text-xs font-medium text-fg-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Changement d'étape rapide */}
        <div className="flex flex-col gap-1.5 border-t border-border pt-4 sm:flex-row sm:items-center sm:gap-3">
          <Label className="text-xs uppercase tracking-wide text-fg-subtle">
            Étape
          </Label>
          <Select
            value={opportunity.stage}
            onValueChange={(v) => handleStage(v as Stage)}
          >
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale : timeline */}
        <section className="lg:col-span-2">
          <Panel title="Activité">
            <ActivityTimeline opportunityId={opportunity._id} />
          </Panel>
        </section>

        {/* Colonne latérale */}
        <aside className="flex flex-col gap-6">
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

      {/* Dialog d'édition */}
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

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function CompanyContactPanel({
  company,
  contact,
}: {
  company?: LoadedOpportunity['company']
  contact?: LoadedOpportunity['contact']
}) {
  return (
    <Panel title="Entreprise et contact">
      {!company && !contact ? (
        <p className="text-sm text-fg-muted">
          Aucune entreprise ni contact rattaché.
        </p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          {company && (
            <div className="flex items-start gap-2.5">
              <Building2 className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
              <div className="min-w-0">
                <p className="font-medium text-fg">{company.name}</p>
                {company.sector && (
                  <p className="text-fg-muted">{company.sector}</p>
                )}
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
          {contact && (
            <div className="flex items-start gap-2.5">
              <User className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
              <div className="min-w-0">
                <p className="font-medium text-fg">{contact.name}</p>
                {contact.role && (
                  <p className="text-fg-muted">{contact.role}</p>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-accent hover:underline"
                  >
                    {contact.email}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

function FollowupsPanel({
  opportunityId,
  nextActionAt,
}: {
  opportunityId: Id<'opportunities'>
  nextActionAt?: string
}) {
  const followups = useQuery(api.followups.list, { opportunityId })
  const create = useMutation(api.followups.create)
  const toggle = useMutation(api.followups.toggle)

  const [label, setLabel] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!label.trim() || !dueDate || pending) return
    setPending(true)
    try {
      await create({ label: label.trim(), dueDate, opportunityId })
      toast.success(`Relance planifiée pour le ${formatDate(dueDate)}.`)
      setLabel('')
      setDueDate('')
      setAdding(false)
    } catch {
      toast.error("La relance n'a pas pu être planifiée.")
    } finally {
      setPending(false)
    }
  }

  async function handleToggle(id: Id<'followups'>, done: boolean) {
    try {
      await toggle({ id, done })
      toast.success(
        done ? 'Relance marquée comme faite.' : 'Relance réactivée.',
      )
    } catch {
      toast.error('Action impossible.')
    }
  }

  return (
    <Panel
      title="Relances"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdding((v) => !v)}
          aria-label="Planifier une relance"
        >
          <Plus className="size-4" />
          Planifier
        </Button>
      }
    >
      {adding && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface-2 p-3"
        >
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Relancer par e-mail..."
            aria-label="Intitulé de la relance"
          />
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Date de la relance"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !label.trim() || !dueDate}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      )}

      {followups === undefined ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : followups.length === 0 ? (
        <div className="text-sm text-fg-muted">
          {nextActionAt ? (
            <span className="inline-flex items-center gap-1.5">
              <BellRing className="size-4 text-fg-subtle" />
              Prochaine action prévue le {formatDateShort(nextActionAt)}.
            </span>
          ) : (
            'Aucune relance prévue.'
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {followups.map((followup) => (
            <li
              key={followup._id}
              className="flex items-center gap-2.5 rounded-[var(--radius)] border border-border px-3 py-2"
            >
              <button
                type="button"
                onClick={() => handleToggle(followup._id, !followup.done)}
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                  followup.done
                    ? 'border-success bg-success text-white'
                    : 'border-border-strong hover:border-accent',
                )}
                aria-label={
                  followup.done
                    ? 'Réactiver la relance'
                    : 'Marquer comme faite'
                }
              >
                {followup.done && <Check className="size-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm',
                    followup.done
                      ? 'text-fg-subtle line-through'
                      : 'text-fg',
                  )}
                >
                  {followup.label}
                </p>
              </div>
              {!followup.done && <DueBadge date={followup.dueDate} />}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function AttachedDocumentsPanel({
  opportunityId,
}: {
  opportunityId: Id<'opportunities'>
}) {
  const documents = useQuery(api.documents.list, { opportunityId })

  return (
    <Panel
      title="Documents"
      action={
        <Link
          to="/app/documents"
          className="text-sm font-medium text-accent hover:underline"
        >
          Gérer
        </Link>
      }
    >
      {documents === undefined ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Aucun document rattaché à cette opportunité.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc._id}>
              <a
                href={doc.url ?? undefined}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  'flex items-center gap-2.5 rounded-[var(--radius)] border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2',
                  !doc.url && 'pointer-events-none opacity-60',
                )}
              >
                <FileText className="size-4 shrink-0 text-fg-subtle" />
                <span className="truncate font-medium text-fg">
                  {doc.name}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function DeleteDialog({
  onConfirm,
  pending,
}: {
  onConfirm: () => void
  pending: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" aria-label="Supprimer">
          <Trash2 className="size-4" />
          Supprimer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette opportunité ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. La timeline d'activité sera également
            supprimée. Les relances et documents seront détachés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={pending}
            className="bg-danger text-white hover:bg-danger/90"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-32" />
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
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
      <h1 className="text-lg font-semibold text-fg">Opportunité introuvable</h1>
      <p className="text-sm text-fg-muted">
        Cette opportunité n'existe pas ou ne vous appartient pas.
      </p>
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Retour aux opportunités
      </Button>
    </div>
  )
}
