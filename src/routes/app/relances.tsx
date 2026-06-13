import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { AlertTriangle, BellRing, CheckCircle2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Skeleton } from '~/components/ui/skeleton'
import { Badge } from '~/components/ui/badge'
import {
  FollowupItem,
  type Followup,
} from '~/components/relances/followup-item'
import { NewFollowupDialog } from '~/components/relances/new-followup-dialog'

export const Route = createFileRoute('/app/relances')({
  component: RelancesPage,
  head: () => ({ meta: [{ title: 'Relances · Filon' }] }),
})

type DueGroups = {
  overdue: Followup[]
  today: Followup[]
  thisWeek: Followup[]
  later: Followup[]
}

function RelancesPage() {
  const groups = useQuery(api.followups.due, {}) as DueGroups | undefined

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      {groups === undefined ? (
        <LoadingState />
      ) : (
        <Content groups={groups} />
      )}
    </div>
  )
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
          Relances
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Ce qu'il faut relancer, classé par échéance. Ne laissez plus filer une
          piste faute de suivi.
        </p>
      </div>
      <NewFollowupDialog />
    </div>
  )
}

function Content({ groups }: { groups: DueGroups }) {
  const total =
    groups.overdue.length +
    groups.today.length +
    groups.thisWeek.length +
    groups.later.length

  if (total === 0) return <EmptyState />

  return (
    <div className="flex flex-col gap-7">
      <Section
        title="En retard"
        tone="danger"
        items={groups.overdue}
        icon={<AlertTriangle className="size-4 text-danger" />}
      />
      <Section
        title="Aujourd'hui"
        tone="warning"
        items={groups.today}
        icon={<BellRing className="size-4 text-warning" />}
      />
      <Section
        title="Cette semaine"
        tone="neutral"
        items={groups.thisWeek}
      />
      <Section title="Plus tard" tone="neutral" items={groups.later} />
    </div>
  )
}

function Section({
  title,
  tone,
  items,
  icon,
}: {
  title: string
  tone: 'danger' | 'warning' | 'neutral'
  items: Followup[]
  icon?: React.ReactNode
}) {
  if (items.length === 0) return null
  const variant =
    tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'outline'

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        {icon}
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
          {title}
        </h2>
        <Badge variant={variant} className="tabular-nums">
          {items.length}
        </Badge>
      </header>
      <div className="flex flex-col gap-2.5">
        {items.map((followup) => (
          <FollowupItem key={followup._id} followup={followup} />
        ))}
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckCircle2 className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-fg">
        Vous êtes à jour
      </h2>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        Aucune relance prévue. Planifiez votre prochaine relance pour ne rien
        laisser filer.
      </p>
      <div className="mt-5">
        <NewFollowupDialog />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-7">
      {[3, 2].map((count, s) => (
        <section key={s} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-surface p-3.5"
              >
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
