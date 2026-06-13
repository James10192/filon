import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  StickyNote,
  Mail,
  Phone,
  Users,
  ArrowLeftRight,
  Circle,
  Loader2,
  Trash2,
  Send,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { ACTIVITY_META, formatDateTime, type ActivityKind } from './meta'

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  note: StickyNote,
  email: Mail,
  call: Phone,
  interview: Users,
  status_change: ArrowLeftRight,
  other: Circle,
}

const COMPOSER_KINDS: ActivityKind[] = ['note', 'email', 'call', 'interview', 'other']

/** Composer de note + timeline des activités d'une opportunité. */
export function ActivityTimeline({
  opportunityId,
}: {
  opportunityId: Id<'opportunities'>
}) {
  const activities = useQuery(api.activities.listByOpportunity, {
    opportunityId,
  })
  const add = useMutation(api.activities.add)
  const remove = useMutation(api.activities.remove)

  const [content, setContent] = useState('')
  const [kind, setKind] = useState<ActivityKind>('note')
  const [pending, setPending] = useState(false)

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = content.trim()
    if (trimmed.length === 0 || pending) return
    setPending(true)
    try {
      await add({ opportunityId, kind, content: trimmed })
      setContent('')
      setKind('note')
      toast.success('Activité ajoutée.')
    } catch {
      toast.error("L'activité n'a pas pu être ajoutée.")
    } finally {
      setPending(false)
    }
  }

  async function handleRemove(id: Id<'activities'>) {
    try {
      await remove({ id })
      toast.success('Activité supprimée.')
    } catch {
      toast.error('La suppression a échoué.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ajoutez une note, consignez un échange..."
          rows={3}
        />
        <div className="flex items-center justify-between gap-2">
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as ActivityKind)}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPOSER_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {ACTIVITY_META[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="submit"
            size="sm"
            disabled={pending || content.trim().length === 0}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Ajouter
          </Button>
        </div>
      </form>

      {activities === undefined ? (
        <TimelineSkeleton />
      ) : activities.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
          Aucune activité, ajoutez une note ou planifiez une relance.
        </p>
      ) : (
        <ol className="flex flex-col">
          {activities.map((activity, index) => {
            const Icon = KIND_ICON[activity.kind]
            const last = index === activities.length - 1
            return (
              <li key={activity._id} className="group relative flex gap-3 pb-5">
                {!last && (
                  <span
                    aria-hidden
                    className="absolute left-[15px] top-8 bottom-0 w-px bg-border"
                  />
                )}
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border border-border',
                    activity.kind === 'status_change'
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface-2 text-fg-muted',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-fg-subtle">
                      {ACTIVITY_META[activity.kind].label}
                      <span className="mx-1.5">·</span>
                      {formatDateTime(activity.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(activity._id)}
                      className="shrink-0 rounded-md p-1 text-fg-subtle opacity-0 transition-opacity hover:bg-surface-2 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label="Supprimer cette activité"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-fg">
                    {activity.content}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
