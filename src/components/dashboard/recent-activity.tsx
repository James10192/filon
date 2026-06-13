import { useQuery } from 'convex/react'
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
type RecentActivity = Doc<'activities'> & { opportunityTitle: string }

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
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(ms))
}

/** Bloc « Activité récente » : flux des dernières activités du user. */
export function RecentActivity() {
  const activities = useQuery(api.activities.recent, { limit: 8 })

  if (activities === undefined) return <RecentActivitySkeleton />

  const list = activities as RecentActivity[]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ActivityIcon className="size-4.5 text-fg-muted" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {list.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-fg-subtle">
            Aucune activité pour l'instant.
          </p>
        ) : (
          list.map((a) => {
            const meta = KIND_META[a.kind]
            const Icon = meta.icon
            return (
              <div
                key={a._id}
                className="flex items-start gap-3 rounded-[var(--radius)] px-2 py-2"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
                  <Icon className="size-3.5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-fg">
                    <span className="font-medium">{a.opportunityTitle}</span>
                    <span className="text-fg-subtle"> · {meta.label}</span>
                  </span>
                  <span className="truncate text-xs text-fg-muted">
                    {a.content}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-fg-subtle">
                  {relativeTime(a.createdAt)}
                </span>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

/** Squelette du bloc activité récente (état loading). */
export function RecentActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-2 py-2">
            <Skeleton className="size-7 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
