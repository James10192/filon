import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { BellRing, Check, CalendarClock, AlertTriangle } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import { formatDateShort } from './pipeline-meta'

type Followup = Doc<'followups'> & { opportunityTitle?: string }

/**
 * Bloc « Relances à faire ». Agrège les relances en retard et celles dues
 * aujourd'hui, action inline « Marquer comme faite » avec toast. Lit le
 * domaine followups (api.followups.overdue / api.followups.upcoming).
 */
export function FollowupsDue() {
  const overdue = useQuery(api.followups.overdue, {})
  const upcoming = useQuery(api.followups.upcoming, { withinDays: 0 })
  const toggle = useMutation(api.followups.toggle)
  const [pending, setPending] = useState<Set<string>>(new Set())

  const loading = overdue === undefined || upcoming === undefined

  async function markDone(id: Id<'followups'>) {
    setPending((prev) => new Set(prev).add(id))
    try {
      await toggle({ id, done: true })
      toast.success('Relance marquée comme faite.')
    } catch {
      toast.error('Action impossible.')
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  if (loading) return <FollowupsDueSkeleton />

  const overdueList = (overdue ?? []) as Followup[]
  // `upcoming` avec withinDays=0 renvoie les relances dont dueDate <= aujourd'hui ;
  // on retire celles déjà comptées comme en retard pour ne garder que « aujourd'hui ».
  const overdueIds = new Set(overdueList.map((f) => f._id))
  const todayList = ((upcoming ?? []) as Followup[]).filter(
    (f) => !overdueIds.has(f._id),
  )

  const isEmpty = overdueList.length === 0 && todayList.length === 0

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4.5 text-fg-muted" />
          Relances à faire
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/relances">Tout voir</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {overdueList.map((f) => (
              <FollowupRow
                key={f._id}
                followup={f}
                tone="danger"
                busy={pending.has(f._id)}
                onDone={() => markDone(f._id)}
              />
            ))}
            {todayList.map((f) => (
              <FollowupRow
                key={f._id}
                followup={f}
                tone="warning"
                busy={pending.has(f._id)}
                onDone={() => markDone(f._id)}
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function FollowupRow({
  followup,
  tone,
  busy,
  onDone,
}: {
  followup: Followup
  tone: 'danger' | 'warning'
  busy: boolean
  onDone: () => void
}) {
  const Icon = tone === 'danger' ? AlertTriangle : CalendarClock
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius)] px-2 py-2 transition-colors hover:bg-surface-2">
      <Icon
        className={cn(
          'size-4 shrink-0',
          tone === 'danger' ? 'text-danger' : 'text-warning',
        )}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-fg">
          {followup.label}
        </span>
        <span className="truncate text-xs text-fg-subtle">
          {followup.opportunityTitle ? `${followup.opportunityTitle} · ` : ''}
          {tone === 'danger' ? 'En retard · ' : "Aujourd'hui · "}
          {formatDateShort(followup.dueDate)}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0"
        disabled={busy}
        onClick={onDone}
        aria-label="Marquer comme faite"
      >
        <Check className="size-4" />
        <span className="hidden sm:inline">Faite</span>
      </Button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
        <Check className="size-5" />
      </span>
      <p className="text-sm text-fg-muted">
        Aucune relance en attente. Vous êtes à jour.
      </p>
    </div>
  )
}

/** Squelette du bloc relances (état loading). */
export function FollowupsDueSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="size-4 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
