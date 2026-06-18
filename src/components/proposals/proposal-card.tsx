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
  Users,
  XCircle,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
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
import {
  recipientSummaryLabel,
  type RecipientSummary,
} from './recipient-status'

type ProposalRow = Doc<'proposals'> & { companyName?: string }

export function ProposalCard({
  proposal,
  recipientSummary,
  onSelect,
  onEdit,
}: {
  proposal: ProposalRow
  recipientSummary?: RecipientSummary
  onSelect: () => void
  onEdit: (proposal: Doc<'proposals'>) => void
}) {
  const setStatus = useMutation(api.proposals.setStatus)
  const remove = useMutation(api.proposals.remove)
  const convert = useMutation(api.proposals.convertToOpportunity)

  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmConvert, setConfirmConvert] = useState(false)

  const status = proposal.status as ProposalStatus
  const amount = formatAmount(proposal.amount, proposal.currency)
  const sentAt = formatDate(proposal.sentAt)
  const recipientLabel = recipientSummary
    ? recipientSummaryLabel(recipientSummary)
    : null

  async function changeStatus(next: ProposalStatus) {
    if (busy) return
    setBusy(true)
    try {
      await setStatus({ id: proposal._id, status: next })
      toast.success(
        m.prop_toast_status_changed({ label: STATUS_LABELS[next].toLowerCase() }),
      )
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
    <article className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-border-strong sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onSelect}
            className="block max-w-full truncate text-left text-base font-semibold tracking-[-0.01em] text-fg transition-colors hover:text-accent focus-visible:outline-none focus-visible:underline"
          >
            {proposal.title}
          </button>
          {recipientLabel ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-muted">
              <Users className="size-3.5 shrink-0 text-fg-subtle" />
              <span className="truncate">{recipientLabel}</span>
            </p>
          ) : proposal.companyName ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-muted">
              <Building2 className="size-3.5 shrink-0 text-fg-subtle" />
              <span className="truncate">{proposal.companyName}</span>
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-fg-subtle">
              {m.prop_no_target_company()}
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
          <span className="assay font-medium text-fg-muted">{amount}</span>
        )}
        {sentAt && (
          <span>
            {m.prop_sent_on_prefix()} <span className="assay">{sentAt}</span>
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusActions status={status} busy={busy} onChange={changeStatus} />
          {status === 'accepted' && (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirmConvert(true)}
            >
              <Rocket className="size-4" />
              {m.prop_action_convert()}
            </Button>
          )}
        </div>
        <div className="ml-auto shrink-0">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={m.prop_actions_aria()}
                disabled={busy}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => onEdit(proposal)}>
                <Pencil className="size-4" />
                {m.prop_action_edit()}
              </DropdownMenuItem>
              {status !== 'draft' && (
                <DropdownMenuItem onSelect={() => changeStatus('draft')}>
                  <Undo2 className="size-4" />
                  {m.prop_action_back_to_draft()}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                {m.prop_action_delete()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
        {m.prop_action_mark_sent()}
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
          {m.prop_action_accepted()}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onChange('refused')}
        >
          <XCircle className="size-4" />
          {m.prop_action_refused()}
        </Button>
      </>
    )
  }
  // accepted / refused : pas d'action primaire ici (gerees via le menu).
  return null
}
