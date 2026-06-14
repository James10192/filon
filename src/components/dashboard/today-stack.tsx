import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import {
  Check,
  CalendarClock,
  AlertTriangle,
  ListChecks,
  ArrowUpRight,
} from 'lucide-react'
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
 * Pile « A faire aujourd'hui » : relances EN RETARD d'abord, puis celles dues
 * AUJOURD'HUI. Chaque ligne est actionnable (marquer faite -> toggle) et mene
 * a l'opportunite liee. Dense, sobre. Lit `api.followups.overdue` +
 * `api.followups.upcoming` (withinDays=0).
 */
export function TodayStack() {
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

  if (loading) return <TodayStackSkeleton />

  const overdueList = (overdue ?? []) as Followup[]
  const overdueIds = new Set(overdueList.map((f) => f._id))
  // `upcoming` (withinDays=0) renvoie dueDate <= aujourd'hui ; on retire les
  // relances deja comptees en retard pour ne garder que « aujourd'hui ».
  const todayList = ((upcoming ?? []) as Followup[]).filter(
    (f) => !overdueIds.has(f._id),
  )

  const total = overdueList.length + todayList.length
  const isEmpty = total === 0

  return (
    <Card
      className="reveal flex h-full flex-col"
      style={{ ['--reveal-i' as string]: 5 }}
    >
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <ListChecks className="size-4.5 text-fg-muted" />
          Prochaines actions
          {!isEmpty && (
            <span
              className={cn(
                'assay inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                overdueList.length > 0
                  ? 'bg-danger-soft text-danger'
                  : 'bg-accent-soft text-accent',
              )}
            >
              {total}
            </span>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/relances">Tout voir</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-0.5">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {overdueList.map((f) => (
              <ActionRow
                key={f._id}
                followup={f}
                tone="danger"
                busy={pending.has(f._id)}
                onDone={() => markDone(f._id)}
              />
            ))}
            {todayList.map((f) => (
              <ActionRow
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

function ActionRow({
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
    <div className="group flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 transition-colors hover:bg-surface-2">
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
        <span className="flex items-center gap-1 truncate text-xs text-fg-subtle">
          {followup.opportunityId && followup.opportunityTitle ? (
            <Link
              to="/app/opportunites/$id"
              params={{ id: followup.opportunityId }}
              className="inline-flex items-center gap-0.5 truncate hover:text-fg hover:underline"
            >
              {followup.opportunityTitle}
              <ArrowUpRight className="size-3 shrink-0" />
            </Link>
          ) : null}
          {followup.opportunityTitle ? <span aria-hidden>·</span> : null}
          <span
            className={cn(
              'shrink-0',
              tone === 'danger' ? 'text-danger' : 'text-warning',
            )}
          >
            {tone === 'danger' ? 'En retard' : "Aujourd'hui"}
          </span>
          <span aria-hidden>·</span>
          <span className="assay shrink-0">{formatDateShort(followup.dueDate)}</span>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 shrink-0"
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
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
        <Check className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">Vous êtes à jour</p>
      <p className="max-w-[15rem] text-xs text-fg-muted">
        Aucune relance en retard ni prévue aujourd'hui. Planifiez la suite depuis
        une opportunité.
      </p>
    </div>
  )
}

/** Squelette de la pile du jour (etat loading). */
export function TodayStackSkeleton() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 px-2 py-2">
            <Skeleton className="size-4 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
