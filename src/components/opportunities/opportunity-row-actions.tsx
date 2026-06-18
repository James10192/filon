import { useState } from 'react'
import { useMutation } from 'convex/react'
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  SquareArrowOutUpRight,
  Trash2,
} from 'lucide-react'
import type { Doc } from '../../../convex/_generated/dataModel'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
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
} from '~/components/ui/alert-dialog'
import {
  OpportunityForm,
  type OpportunityFormSubmit,
} from './opportunity-form'
import { buildUpdateArgs } from './update-args'

type Opportunity = Doc<'opportunities'>

/**
 * Menu d'actions de ligne (ouvrir / modifier / supprimer) + dialogs associes.
 * Isole de la colonne pour garder les definitions de colonnes legeres.
 */
export function OpportunityRowActions({
  opportunity,
  onOpen,
}: {
  opportunity: Opportunity
  onOpen: () => void
}) {
  const remove = useMutation(api.opportunities.remove)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    try {
      await remove({ id: opportunity._id })
      toast.success(m.opp_removed())
      setConfirmOpen(false)
    } catch {
      toast.error(m.opp_delete_error())
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-fg-subtle opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={m.opp_row_actions_aria()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpen}>
            <SquareArrowOutUpRight className="size-4" />
            {m.opp_action_open()}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            {m.opp_action_edit()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setConfirmOpen(true)
            }}
          >
            <Trash2 className="size-4" />
            {m.opp_action_delete()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.opp_delete_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.opp_delete_confirm_desc()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{m.opp_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleRemove()
              }}
              disabled={removing}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {removing && <Loader2 className="size-4 animate-spin" />}
              {m.opp_delete_confirm_action()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        opportunity={opportunity}
      />
    </div>
  )
}

function EditDialog({
  open,
  onOpenChange,
  opportunity,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: Opportunity
}) {
  const update = useMutation(api.opportunities.update)
  const [pending, setPending] = useState(false)

  async function handleEdit(values: OpportunityFormSubmit) {
    setPending(true)
    try {
      // update() ne change pas le stage (cf. contrat). Forwarde cible + source.
      await update(buildUpdateArgs(opportunity._id, values))
      toast.success(m.opp_changes_saved())
      onOpenChange(false)
    } catch {
      toast.error(m.opp_changes_save_error())
    } finally {
      setPending(false)
    }
  }

  // Cible effective dérivée (la ligne brute peut ne pas stocker targetType).
  const effectiveTargetType =
    opportunity.targetType ??
    (opportunity.companyId
      ? 'company'
      : opportunity.contactId
        ? 'person'
        : 'none')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.opp_edit_title()}</DialogTitle>
          <DialogDescription>
            {m.opp_edit_desc_table()}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <OpportunityForm
            withStage={false}
            submitLabel={m.opp_save()}
            pending={pending}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleEdit}
            initial={{
              title: opportunity.title,
              type: opportunity.type,
              targetType: effectiveTargetType,
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
        )}
      </DialogContent>
    </Dialog>
  )
}
