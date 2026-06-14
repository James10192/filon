import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import {
  Activity as ActivityIcon,
  StickyNote,
  Mail,
  Phone,
  Users,
  ArrowRightLeft,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

type ActivityKind = Doc<'activities'>['kind']
type RecentActivityItem = Doc<'activities'> & {
  opportunityId: Doc<'opportunities'>['_id']
  opportunityTitle: string
}

const KIND_META: Record<ActivityKind, { label: string; icon: LucideIcon }> = {
  note: { label: 'Note', icon: StickyNote },
  email: { label: 'E-mail', icon: Mail },
  call: { label: 'Appel', icon: Phone },
  interview: { label: 'Entretien', icon: Users },
  status_change: { label: 'Changement d’étape', icon: ArrowRightLeft },
  other: { label: 'Activité', icon: CircleDot },
}

/** Formate un timestamp ms en libellé relatif court FR (ex. « il y a 2 h »). */
function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const min = Math.round(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d < 7) return `il y a ${d} j`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(
    new Date(ms),
  )
}

/**
 * « Activité récente » : timeline verticale (rail de date à gauche, pastille
 * d'icône par type, ligne concise). Lit `api.activities.recent`.
 */
export function RecentActivity() {
  const activities = useQuery(api.activities.recent, { limit: 8 })
  if (activities === undefined) return <RecentActivitySkeleton />

  const list = activities as RecentActivityItem[]

  return (
    <Card
      className="reveal flex h-full flex-col"
      style={{ ['--reveal-i' as string]: 6 }}
    >
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <ActivityIcon className="size-4.5 text-fg-muted" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {list.length === 0 ? (
          <EmptyActivity />
        ) : (
          <ol className="relative flex flex-col">
            {list.map((a, i) => (
              <TimelineRow key={a._id} activity={a} last={i === list.length - 1} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineRow({
  activity,
  last,
}: {
  activity: RecentActivityItem
  last: boolean
}) {
  const meta = KIND_META[activity.kind]
  const Icon = meta.icon
  return (
    <li className="flex gap-3">
      {/* Rail : pastille + trait vertical de liaison. */}
      <div className="flex flex-col items-center">
        <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-fg-muted">
          <Icon className="size-3.5" />
        </span>
        {!last && <span className="w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-4 pt-1">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            to="/app/opportunites"
            search={{ view: 'liste', id: activity.opportunityId }}
            className="truncate text-sm font-medium text-fg hover:underline"
          >
            {activity.opportunityTitle}
          </Link>
          <span className="assay-meta shrink-0 text-xs">
            {relativeTime(activity.createdAt)}
          </span>
        </div>
        <span className="truncate text-xs text-fg-muted">
          <span className="text-fg-subtle">{meta.label}</span>
          {activity.content ? ` · ${activity.content}` : ''}
        </span>
      </div>
    </li>
  )
}

function EmptyActivity() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
        <ActivityIcon className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">Pas encore d'activité</p>
      <p className="max-w-[16rem] text-xs text-fg-muted">
        Vos notes, e-mails et changements d'étape s'afficheront ici dès votre
        première interaction sur une opportunité.
      </p>
    </div>
  )
}

/** Squelette du bloc activité récente (état loading). */
export function RecentActivitySkeleton() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-7 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
