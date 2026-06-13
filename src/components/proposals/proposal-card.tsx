import { useState } from 'react'
import { useMutation } from 'convex/react'
import {
  Building2,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Rocket,
  Send,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { toast } from '~/components/ui/sonner'
import {
  formatAmount,
  formatDate,
  STATUS_BADGE,
  STATUS_LABELS,
  type ProposalStatus,
} from './proposal-status'

type ProposalRow = Doc<'proposals'> & { companyName?: string }

export function ProposalCard({
  proposal,
  onEdit,
}: {
  proposal: ProposalRow
  onEdit: (proposal: Doc<'proposals'>) => void
}) {
  const setStatus = useMutation(api.proposals.setStatus)
  const remove = useMutation(api.proposals.remove)
  const createOpportunity = useMutation(api.opportunities.create)

  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmConvert, setConfirmConvert] = useState(false)

  const status = proposal.status as ProposalStatus
  const amount = formatAmount(proposal.amount, proposal.currency)
  const sentAt = formatDate(proposal.sentAt)

  async function changeStatus(next: ProposalStatus) {
    if (busy) return
    setBusy(true)
    try {
      await setStatus({ id: proposal._id, status: next })
      toast.success(`Proposition marquee "${STATUS_LABELS[next].toLowerCase()}".`)
    } catch {
      toast.error("Le statut n'a pas pu etre change.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) return
    setBusy(true)
    try {
      await remove({ id: proposal._id })
      toast.success('Proposition supprimee.')
    } catch {
      toast.error('La suppression a echoue.')
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  async function handleConvert() {
    if (busy) return
    setBusy(true)
    try {
      // Une proposition acceptee devient une opportunite de type mission.
      const args: {
        title: string
        type: 'mission'
        stage: 'won'
        description: string
        companyId?: Doc<'proposals'>['companyId']
        compensation?: string
      } = {
        title: proposal.title,
        type: 'mission',
        stage: 'won',
        description: proposal.pitch,
      }
      if (proposal.companyId) args.companyId = proposal.companyId
      const comp = formatAmount(proposal.amount, proposal.currency)
      if (comp) args.compensation = comp
      await createOpportunity(args)
      toast.success('Convertie en mission dans le pipeline.')
    } catch {
      toast.error('La conversion a echoue.')
    } finally {
      setBusy(false)
      setConfirmConvert(false)
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-border-strong sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-fg">
            {proposal.title}
          </h3>
          {proposal.companyName ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-muted">
              <Building2 className="size-3.5 shrink-0 text-fg-subtle" />
              <span className="truncate">{proposal.companyName}</span>
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-fg-subtle">
              Sans entreprise cible
            </p>
          )}
        </div>
        <Badge variant={STATUS_BADGE[status]} className="shrink-0">
          {STATUS_LABELS[status]}
        </Badge>
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">
        {proposal.pitch}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
        {amount && (
          <span className="font-medium tabular-nums text-fg-muted">
            {amount}
          </span>
        )}
        {sentAt && <span>Envoyee le {sentAt}</span>}
      </div>

      <div className="mt-1 flex items-center gap-2">
        <StatusActions status={status} busy={busy} onChange={changeStatus} />
        {status === 'accepted' && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => setConfirmConvert(true)}
          >
            <Rocket className="size-4" />
            Convertir en mission
          </Button>
        )}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Actions"
                disabled={busy}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => onEdit(proposal)}>
                <Pencil className="size-4" />
                Modifier
              </DropdownMenuItem>
              {status !== 'draft' && (
                <DropdownMenuItem onSelect={() => changeStatus('draft')}>
                  <Undo2 className="size-4" />
                  Repasser en brouillon
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette proposition ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {proposal.title} » sera definitivement supprimee. Cette action
              est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={busy}
              className="bg-danger text-[var(--color-accent-fg)] hover:bg-danger/90"
            >
              Supprimer definitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmConvert} onOpenChange={setConfirmConvert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir en mission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une opportunite de type mission sera creee dans votre pipeline a
              partir de cette proposition acceptee. La proposition reste
              inchangee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleConvert()
              }}
              disabled={busy}
            >
              Convertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}

/** Boutons d'action de statut, contextualises selon le statut courant. */
function StatusActions({
  status,
  busy,
  onChange,
}: {
  status: ProposalStatus
  busy: boolean
  onChange: (next: ProposalStatus) => void
}) {
  if (status === 'draft') {
    return (
      <Button size="sm" disabled={busy} onClick={() => onChange('sent')}>
        <Send className="size-4" />
        Marquer envoyee
      </Button>
    )
  }
  if (status === 'sent') {
    return (
      <>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => onChange('accepted')}
        >
          <CheckCircle2 className="size-4" />
          Acceptee
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onChange('refused')}
        >
          <XCircle className="size-4" />
          Refusee
        </Button>
      </>
    )
  }
  // accepted / refused : pas d'action primaire ici (gerees via le menu).
  return null
}
