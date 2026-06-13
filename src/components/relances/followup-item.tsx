import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Check, Loader2, Target, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
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
import { dayDelta, relativeLabel } from './format'

type Followup = Doc<'followups'> & { opportunityTitle?: string }

type Tone = 'danger' | 'warning' | 'neutral'

function dueTone(iso: string): Tone {
  const delta = dayDelta(iso)
  if (delta < 0) return 'danger'
  if (delta === 0) return 'warning'
  return 'neutral'
}

export function FollowupItem({ followup }: { followup: Followup }) {
  const toggle = useMutation(api.followups.toggle)
  const remove = useMutation(api.followups.remove)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const tone = followup.done ? 'neutral' : dueTone(followup.dueDate)

  async function onToggle() {
    if (busy) return
    setBusy(true)
    const next = !followup.done
    try {
      await toggle({ id: followup._id, done: next })
      toast.success(
        next ? 'Relance marquée comme faite.' : 'Relance rouverte.',
      )
    } catch {
      toast.error('Action impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function onRemove() {
    setRemoving(true)
    try {
      await remove({ id: followup._id })
      toast.success('Relance supprimée.')
      setConfirmOpen(false)
    } catch {
      toast.error('La suppression a échoué.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-[var(--radius)] border border-border bg-surface p-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-border-strong',
        followup.done && 'opacity-60',
      )}
    >
      <CheckButton done={followup.done} busy={busy} onToggle={onToggle} />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium text-fg',
            followup.done && 'line-through decoration-fg-subtle',
          )}
        >
          {followup.label}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {!followup.done && (
            <DueBadge tone={tone} label={relativeLabel(followup.dueDate)} />
          )}
          {followup.done && (
            <span className="text-xs text-fg-subtle">
              {relativeLabel(followup.dueDate)}
            </span>
          )}
          {followup.opportunityTitle && (
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-fg-muted">
              <Target className="size-3.5 shrink-0 text-fg-subtle" />
              <span className="truncate">{followup.opportunityTitle}</span>
            </span>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Supprimer la relance"
            className="shrink-0 text-fg-subtle opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette relance ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {followup.label} » sera définitivement supprimée. Cette action
              est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void onRemove()
              }}
              disabled={removing}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {removing && <Loader2 className="size-4 animate-spin" />}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CheckButton({
  done,
  busy,
  onToggle,
}: {
  done: boolean
  busy: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={done}
      aria-label={done ? 'Marquer comme non faite' : 'Marquer comme faite'}
      className={cn(
        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
        done
          ? 'border-success bg-success text-white'
          : 'border-border-strong text-transparent hover:border-accent hover:text-accent/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] disabled:opacity-55',
      )}
    >
      {busy ? (
        <Loader2 className="size-3 animate-spin text-fg-subtle" />
      ) : (
        <Check className="size-3" strokeWidth={3} />
      )}
    </button>
  )
}

function DueBadge({ tone, label }: { tone: Tone; label: string }) {
  const variant =
    tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'outline'
  return <Badge variant={variant}>{label}</Badge>
}

export type { Followup, Id }
