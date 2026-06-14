import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import {
  CalendarClock,
  CalendarDays,
  BellRing,
  Flag,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'
import { Skeleton } from '~/components/ui/skeleton'
import { StageChip } from '../chips'
import {
  flattenFeed,
  groupByDay,
  BUCKET_LABEL,
  BUCKET_ORDER,
  KIND_LABEL,
  type CalendarBucket,
  type CalendarGroup,
  type CalendarKind,
} from './calendar-utils'

const KIND_ICON: Record<CalendarKind, LucideIcon> = {
  deadline: Flag,
  nextAction: CalendarClock,
  followup: BellRing,
}

const BUCKET_TONE: Record<CalendarBucket, string> = {
  overdue: 'text-danger',
  today: 'text-accent',
  thisWeek: 'text-fg',
  later: 'text-fg-muted',
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Vue Calendrier (agenda) : échéances + prochaines actions + relances dues,
 * regroupées par jour et par bucket relatif (En retard / Aujourd'hui / Cette
 * semaine / Plus tard). Custom, sans dépendance calendrier lourde. Les dates
 * sont en mono `.assay`. Cliquer un item ouvre le panneau split.
 */
export function CalendarView({
  onSelect,
}: {
  onSelect: (id: Id<'opportunities'>) => void
}) {
  const feed = useQuery(api.opportunities.calendar, {})

  const sections = useMemo(() => {
    if (!feed) return undefined
    const groups = groupByDay(flattenFeed(feed))
    const byBucket = new Map<CalendarBucket, CalendarGroup[]>()
    for (const g of groups) {
      const list = byBucket.get(g.bucket) ?? []
      list.push(g)
      byBucket.set(g.bucket, list)
    }
    // Les jours « en retard » se lisent du plus récent au plus ancien.
    byBucket.get('overdue')?.sort((a, b) => b.date.getTime() - a.date.getTime())
    return BUCKET_ORDER.map((bucket) => ({
      bucket,
      groups: byBucket.get(bucket) ?? [],
    })).filter((s) => s.groups.length > 0)
  }, [feed])

  if (sections === undefined) return <CalendarSkeleton />

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CalendarDays className="size-6" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-fg">Agenda vide</h2>
          <p className="mx-auto max-w-md text-sm text-fg-muted">
            Ajoutez une échéance ou planifiez une relance sur une opportunité
            pour la voir apparaître ici.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {sections.map(({ bucket, groups }) => (
        <section key={bucket} className="flex flex-col gap-2.5">
          <h2
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.08em]',
              BUCKET_TONE[bucket],
            )}
          >
            {BUCKET_LABEL[bucket]}
          </h2>
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <DayGroup key={group.dayKey} group={group} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function DayGroup({
  group,
  onSelect,
}: {
  group: CalendarGroup
  onSelect: (id: Id<'opportunities'>) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8.5rem_1fr]">
      <div className="assay pt-2 text-sm font-medium capitalize text-fg-muted">
        {formatDay(group.date)}
      </div>
      <div className="flex flex-col gap-1.5">
        {group.items.map((item) => {
          const Icon = KIND_ICON[item.kind]
          const clickable = item.opportunityId !== null
          return (
            <button
              key={item.key}
              type="button"
              disabled={!clickable}
              onClick={() =>
                item.opportunityId && onSelect(item.opportunityId)
              }
              className={cn(
                'flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-left transition-colors',
                clickable
                  ? 'hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]'
                  : 'cursor-default opacity-80',
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-fg-subtle">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">
                  {item.title}
                </p>
                <p className="text-xs text-fg-subtle">{KIND_LABEL[item.kind]}</p>
              </div>
              {item.stage && <StageChip stage={item.stage} compact />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 2 }).map((_, s) => (
        <div key={s} className="flex flex-col gap-2.5">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8.5rem_1fr]">
            <Skeleton className="h-5 w-28" />
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-[var(--radius)]" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
