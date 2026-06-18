import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import { DueBadge } from '~/components/opportunities/chips'
import { formatDate } from '~/components/opportunities/meta'
import { DetailPanel } from './detail-panel'

/**
 * Panneau de relances rattachées à une proposition. Reprend l'UX du panneau
 * équivalent côté opportunité : ajout inline, coche faite/non faite, suppression,
 * et tous les états (chargement, vide).
 */
export function ProposalFollowupsPanel({
  proposalId,
}: {
  proposalId: Id<'proposals'>
}) {
  const followups = useQuery(api.followups.list, { proposalId })
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
      await create({ label: label.trim(), dueDate, proposalId })
      toast.success(m.prop_followup_toast_scheduled({ date: formatDate(dueDate) }))
      setLabel('')
      setDueDate('')
      setAdding(false)
    } catch {
      toast.error(m.prop_followup_toast_schedule_error())
    } finally {
      setPending(false)
    }
  }

  async function handleToggle(id: Id<'followups'>, done: boolean) {
    try {
      await toggle({ id, done })
      toast.success(done ? m.prop_followup_toast_done() : m.prop_followup_toast_reactivated())
    } catch {
      toast.error(m.prop_followup_toast_error())
    }
  }

  return (
    <DetailPanel
      title={m.prop_followups_title()}
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdding((v) => !v)}
          aria-label={m.prop_followup_schedule_aria()}
        >
          <Plus className="size-4" />
          {m.prop_followup_schedule()}
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
            placeholder={m.prop_followup_label_placeholder()}
            aria-label={m.prop_followup_label_aria()}
            autoFocus
          />
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label={m.prop_followup_date_aria()}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(false)}
            >
              {m.prop_cancel()}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !label.trim() || !dueDate}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {m.prop_save()}
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
        <p className="text-sm text-fg-muted">
          {m.prop_followups_empty()}
        </p>
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
                    ? m.prop_followup_reactivate_aria()
                    : m.prop_followup_mark_done_aria()
                }
              >
                {followup.done && <Check className="size-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm',
                    followup.done ? 'text-fg-subtle line-through' : 'text-fg',
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
    </DetailPanel>
  )
}
