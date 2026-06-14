import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import {
  CheckCircle2,
  Loader2,
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
import { STATUS_LABELS, type ProposalStatus } from './proposal-status'

/**
 * Barre d'actions de la page détail : actions de statut contextuelles,
 * conversion en mission, édition, suppression. Confirmations via AlertDialog.
 */
export function ProposalDetailActions({
  proposal,
  onEdit,
}: {
  proposal: Doc<'proposals'>
  onEdit: () => void
}) {
  const navigate = useNavigate()
  const setStatus = useMutation(api.proposals.setStatus)
  const remove = useMutation(api.proposals.remove)
  const convert = useMutation(api.proposals.convertToOpportunity)

  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmConvert, setConfirmConvert] = useState(false)

  const status = proposal.status as ProposalStatus

  async function changeStatus(next: ProposalStatus) {
    if (busy) return
    setBusy(true)
    try {
      await setStatus({ id: proposal._id, status: next })
      toast.success(
        `Proposition marquée « ${STATUS_LABELS[next].toLowerCase()} ».`,
      )
    } catch {
      toast.error("Le statut n'a pas pu être changé.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) return
    setBusy(true)
    try {
      await remove({ id: proposal._id })
      toast.success('Proposition supprimée.')
      navigate({ to: '/app/propositions' })
    } catch {
      toast.error('La suppression a échoué.')
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  async function handleConvert() {
    if (busy) return
    setBusy(true)
    try {
      const opportunityId = await convert({ id: proposal._id })
      toast.success('Convertie en mission dans le pipeline.')
      setConfirmConvert(false)
      navigate({ to: '/app/opportunites/$id', params: { id: opportunityId } })
    } catch {
      toast.error('La conversion a échoué.')
      setBusy(false)
      setConfirmConvert(false)
    }
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
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

      <Button variant="outline" size="sm" disabled={busy} onClick={onEdit}>
        <Pencil className="size-4" />
        Modifier
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Plus d'actions"
            disabled={busy}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette proposition ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {proposal.title} » sera définitivement supprimée. Cette action
              est irréversible.
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
              className="bg-danger text-white hover:bg-danger/90"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmConvert} onOpenChange={setConfirmConvert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir en mission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une opportunité de type mission sera créée dans votre pipeline à
              partir de cette proposition acceptée. La proposition reste
              inchangée.
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
              {busy && <Loader2 className="size-4 animate-spin" />}
              Convertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Boutons d'action de statut, contextualisés selon le statut courant. */
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
        Marquer envoyée
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
          Acceptée
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onChange('refused')}
        >
          <XCircle className="size-4" />
          Refusée
        </Button>
      </>
    )
  }
  return null
}
