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
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
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
  onOpen,
  onEdit,
}: {
  proposal: Proposal
  onOpen: () => void
  onEdit: (proposal: Proposal) => void
}) {
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
      toast.success(m.prop_toast_status_changed({ label: STATUS_LABELS[next].toLowerCase() }))
    } catch {
      toast.error(m.prop_toast_status_change_error())
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) return
    setBusy(true)
    try {
      await remove({ id: proposal._id })
      toast.success(m.prop_toast_deleted())
    } catch {
      toast.error(m.prop_toast_delete_error())
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
      toast.success(m.prop_toast_converted())
    } catch {
      toast.error(m.prop_toast_convert_error())
    } finally {
      setBusy(false)
      setConfirmConvert(false)
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            aria-label={m.prop_actions_aria()}
            className="text-fg-subtle opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={onOpen}>
            <SquareArrowOutUpRight className="size-4" />
            {m.prop_action_open()}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(proposal)}>
            <Pencil className="size-4" />
            {m.prop_action_edit()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {status === 'draft' && (
            <DropdownMenuItem onSelect={() => changeStatus('sent')}>
              <Send className="size-4" />
              {m.prop_action_mark_sent()}
            </DropdownMenuItem>
          )}
          {status === 'sent' && (
            <>
              <DropdownMenuItem onSelect={() => changeStatus('accepted')}>
                <CheckCircle2 className="size-4" />
                {m.prop_action_mark_accepted()}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => changeStatus('refused')}>
                <XCircle className="size-4" />
                {m.prop_action_mark_refused()}
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
              {m.prop_action_convert()}
            </DropdownMenuItem>
          )}
          {status !== 'draft' && (
            <DropdownMenuItem onSelect={() => changeStatus('draft')}>
              <Undo2 className="size-4" />
              {m.prop_action_back_to_draft()}
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
            {m.prop_action_delete()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.prop_delete_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.prop_delete_confirm_description({ title: proposal.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{m.prop_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={busy}
              className="bg-danger text-[var(--color-accent-fg)] hover:bg-danger/90"
            >
              {m.prop_delete_confirm_action()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmConvert} onOpenChange={setConfirmConvert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.prop_convert_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.prop_convert_confirm_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{m.prop_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleConvert()
              }}
              disabled={busy}
            >
              {m.prop_convert_confirm_action()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
