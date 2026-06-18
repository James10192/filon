import type { FunctionReturnType } from 'convex/server'
import { m } from '~/lib/paraglide/messages'
import type { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import type { OppType, Stage } from '../meta'

type CalendarFeed = FunctionReturnType<typeof api.opportunities.calendar>

export type CalendarKind = 'deadline' | 'nextAction' | 'followup'

/** Item unifié de l'agenda (échéance, prochaine action, relance). */
export type CalendarItem = {
  /** Clé stable unique de l'item. */
  key: string
  kind: CalendarKind
  /** Date ISO de l'item. */
  date: string
  title: string
  /** Opportunité à ouvrir au clic (null pour une relance détachée). */
  opportunityId: Id<'opportunities'> | null
  type?: OppType
  stage?: Stage
}

export type CalendarBucket = 'overdue' | 'today' | 'thisWeek' | 'later'

export type CalendarGroup = {
  /** Jour ISO (yyyy-mm-dd) servant de clé. */
  dayKey: string
  date: Date
  bucket: CalendarBucket
  items: CalendarItem[]
}

/** Début de journée locale d'une date ISO. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Aplati le flux Convex en items d'agenda triables. */
export function flattenFeed(feed: CalendarFeed): CalendarItem[] {
  const items: CalendarItem[] = []
  for (const d of feed.deadlines) {
    items.push({
      key: `deadline:${d.id}`,
      kind: 'deadline',
      date: d.date,
      title: d.title,
      opportunityId: d.id,
      type: d.type,
      stage: d.stage,
    })
  }
  for (const n of feed.nextActions) {
    items.push({
      key: `next:${n.id}`,
      kind: 'nextAction',
      date: n.date,
      title: n.title,
      opportunityId: n.id,
      type: n.type,
      stage: n.stage,
    })
  }
  for (const f of feed.followups) {
    items.push({
      key: `followup:${f.id}`,
      kind: 'followup',
      date: f.date,
      title: f.opportunityTitle ? `${f.label} · ${f.opportunityTitle}` : f.label,
      opportunityId: f.opportunityId,
    })
  }
  return items.filter((i) => !Number.isNaN(new Date(i.date).getTime()))
}

/** Bucket relatif d'une date par rapport à aujourd'hui (semaine = 7 jours). */
function bucketOf(date: Date, today: Date): CalendarBucket {
  const day = startOfDay(date).getTime()
  const start = today.getTime()
  if (day < start) return 'overdue'
  if (day === start) return 'today'
  const week = start + 7 * 24 * 60 * 60 * 1000
  if (day < week) return 'thisWeek'
  return 'later'
}

/**
 * Groupe les items par jour, triés chronologiquement, en annotant le bucket
 * relatif. Les jours passés (en retard) sont rendus du plus récent au plus
 * ancien dans l'appelant ; ici on trie tout en ascendant et on laisse l'UI
 * ordonner les sections.
 */
export function groupByDay(items: CalendarItem[]): CalendarGroup[] {
  const today = startOfDay(new Date())
  const byDay = new Map<string, CalendarGroup>()

  for (const item of items) {
    const date = new Date(item.date)
    const day = startOfDay(date)
    const dayKey = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`
    let group = byDay.get(dayKey)
    if (!group) {
      group = { dayKey, date: day, bucket: bucketOf(day, today), items: [] }
      byDay.set(dayKey, group)
    }
    group.items.push(item)
  }

  const groups = [...byDay.values()]
  groups.sort((a, b) => a.date.getTime() - b.date.getTime())
  return groups
}

export const BUCKET_LABEL: Record<CalendarBucket, string> = {
  get overdue() {
    return m.opp_cal_bucket_overdue()
  },
  get today() {
    return m.opp_cal_bucket_today()
  },
  get thisWeek() {
    return m.opp_cal_bucket_this_week()
  },
  get later() {
    return m.opp_cal_bucket_later()
  },
}

export const BUCKET_ORDER: CalendarBucket[] = [
  'overdue',
  'today',
  'thisWeek',
  'later',
]

export const KIND_LABEL: Record<CalendarKind, string> = {
  get deadline() {
    return m.opp_cal_kind_deadline()
  },
  get nextAction() {
    return m.opp_cal_kind_next_action()
  },
  get followup() {
    return m.opp_cal_kind_followup()
  },
}
