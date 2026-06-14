import { useState } from 'react'
import { useMutation } from 'convex/react'
import {
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Rocket,
  Send,
  SquareArrowOutUpRight,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
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

type Proposal = Doc<'proposals'>

/**
 * Menu d'actions de ligne d'une proposition : ouvrir, modifier, transitions de
 * statut contextuelles, conversion en mission, suppression (AlertDialog).
 * Isole pour garder les definitions de colonnes legeres.
 */
export function ProposalRowActions({
  proposal,
  onEdit,
}: {
  proposal: Proposal
  onEdit: (proposal: Proposal) => void
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
      toast.success(`Proposition marquée « ${STATUS_LABELS[next].toLowerCase()} ».`)
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
    } catch {
      toast.error('La suppression a échoué.')
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  async function handleConvert() {
    if (busy) return
    setBusy(true)
    try {
      await convert({ id: proposal._id })
      toast.success('Convertie en mission dans le pipeline.')
    } catch {
      toast.error('La conversion a échoué.')
    } finally {
      setBusy(false)
      setConfirmConvert(false)
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            aria-label="Actions"
            className="text-fg-subtle opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onSelect={() =>
              navigate({ to: '/app/propositions/$id', params: { id: proposal._id } })
            }
          >
            <SquareArrowOutUpRight className="size-4" />
            Ouvrir
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(proposal)}>
            <Pencil className="size-4" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {status === 'draft' && (
            <DropdownMenuItem onSelect={() => changeStatus('sent')}>
              <Send className="size-4" />
              Marquer envoyée
            </DropdownMenuItem>
          )}
          {status === 'sent' && (
            <>
              <DropdownMenuItem onSelect={() => changeStatus('accepted')}>
                <CheckCircle2 className="size-4" />
                Marquer acceptée
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => changeStatus('refused')}>
                <XCircle className="size-4" />
                Marquer refusée
              </DropdownMenuItem>
            </>
          )}
          {status === 'accepted' && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setConfirmConvert(true)
              }}
            >
              <Rocket className="size-4" />
              Convertir en mission
            </DropdownMenuItem>
          )}
          {status !== 'draft' && (
            <DropdownMenuItem onSelect={() => changeStatus('draft')}>
              <Undo2 className="size-4" />
              Repasser en brouillon
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setConfirmDelete(true)
            }}
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
              className="bg-danger text-[var(--color-accent-fg)] hover:bg-danger/90"
            >
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
              Convertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
