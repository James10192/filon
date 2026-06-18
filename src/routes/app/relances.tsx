import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { AlertTriangle, BellRing, CheckCircle2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Skeleton } from '~/components/ui/skeleton'
import { Badge } from '~/components/ui/badge'
import { PageToolbar } from '~/components/app/page-toolbar'
import {
  FollowupItem,
  type Followup,
} from '~/components/relances/followup-item'
import { NewFollowupDialog } from '~/components/relances/new-followup-dialog'
import { ExportButton } from '~/components/billing/export-button'
import { FOLLOWUP_COLUMNS } from '~/lib/export'

export const Route = createFileRoute('/app/relances')({
  component: RelancesPage,
  head: () => ({ meta: [{ title: m.dash_relances_page_title() }] }),
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
    <div className="flex flex-col">
      <PageToolbar
        title={m.dash_relances_title()}
        subtitle={m.dash_relances_subtitle()}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              base="relances"
              rows={
                groups
                  ? [
                      ...groups.overdue,
                      ...groups.today,
                      ...groups.thisWeek,
                      ...groups.later,
                    ]
                  : []
              }
              columns={FOLLOWUP_COLUMNS}
            />
            <NewFollowupDialog />
          </div>
        }
      />
      {groups === undefined ? (
        <LoadingState />
      ) : (
        <Content groups={groups} />
      )}
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
        title={m.dash_relances_section_overdue()}
        tone="danger"
        items={groups.overdue}
        icon={<AlertTriangle className="size-4 text-danger" />}
      />
      <Section
        title={m.dash_relances_section_today()}
        tone="warning"
        items={groups.today}
        icon={<BellRing className="size-4 text-warning" />}
      />
      <Section
        title={m.dash_relances_section_week()}
        tone="neutral"
        items={groups.thisWeek}
      />
      <Section title={m.dash_relances_section_later()} tone="neutral" items={groups.later} />
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
        {m.dash_relances_empty_title()}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        {m.dash_relances_empty_desc()}
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
