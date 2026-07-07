import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Settings,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Skeleton } from '~/components/ui/skeleton'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { PageToolbar } from '~/components/app/page-toolbar'
import {
  FollowupItem,
  type Followup,
} from '~/components/relances/followup-item'
import { NewFollowupDialog } from '~/components/relances/new-followup-dialog'
import { ExportButton } from '~/components/billing/export-button'
import { FOLLOWUP_COLUMNS } from '~/lib/export'
import { toast } from '~/components/ui/sonner'
import {
  MailPulseLogo,
  MailPulseWordmark,
  mailpulsePanelClassName,
} from '~/components/mailpulse/mailpulse-brand'
import { RecoveryDashboardSection } from '~/components/recovery/recovery-dashboard-section'

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

type MailPulseRecovery = {
  _id: Id<'opportunities'>
  title: string
  status?: 'mailpulse_pending' | 'mailpulse_active'
  compensation?: string
  deadline?: string
  mailpulseLastSyncAt?: number
  mailpulseContactId?: string
  mailpulseSequenceId?: string
}

function RelancesPage() {
  const groups = useQuery(api.followups.due, {}) as DueGroups | undefined
  const mailpulseRecoveries = useQuery(
    api.recovery.listMailpulseRecoveries,
    {},
  ) as MailPulseRecovery[] | undefined

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
      {groups === undefined || mailpulseRecoveries === undefined ? (
        <LoadingState />
      ) : (
        <Content groups={groups} mailpulseRecoveries={mailpulseRecoveries} />
      )}
    </div>
  )
}

function Content({
  groups,
  mailpulseRecoveries,
}: {
  groups: DueGroups
  mailpulseRecoveries: MailPulseRecovery[]
}) {
  const localTotal =
    groups.overdue.length +
    groups.today.length +
    groups.thisWeek.length +
    groups.later.length

  return (
    <div className="flex flex-col gap-7">
      <RecoveryDashboardSection />
      <MailPulseRecoverySection items={mailpulseRecoveries} />
      {localTotal === 0 ? (
        <EmptyState />
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}

function MailPulseRecoverySection({
  items,
}: {
  items: MailPulseRecovery[]
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <MailPulseLogo className="size-7" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
          Recouvrements MailPulse
        </h2>
        <Badge
          variant="outline"
          className="border-orange-200 text-orange-700 dark:border-orange-900 dark:text-orange-300"
        >
          {items.length}
        </Badge>
      </header>
      {items.length === 0 ? (
        <MailPulseRecoveryEmptyCard />
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <MailPulseRecoveryItem key={item._id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

function MailPulseRecoveryEmptyCard() {
  return (
    <div
      className={`flex flex-col gap-3 rounded-[var(--radius)] border p-3.5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center ${mailpulsePanelClassName}`}
    >
      <MailPulseLogo />
      <div className="min-w-0 flex-1">
        <MailPulseWordmark className="text-sm" showLogo={false} />
        <p className="mt-1 text-sm text-fg-muted">
          Aucun recouvrement MailPulse n'est encore lancé. Passez une
          opportunité en gagnée, puis lancez MailPulse depuis la fiche
          opportunité.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        asChild
        className="border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-900/70 dark:text-orange-300 dark:hover:bg-orange-950/30"
      >
        <Link to="/app/parametres">
          <Settings className="size-4" />
          Configurer
        </Link>
      </Button>
    </div>
  )
}

function MailPulseRecoveryItem({ item }: { item: MailPulseRecovery }) {
  const sync = useAction(api.recovery.syncMailpulseRecoveryStatus)
  const [syncing, setSyncing] = useState(false)
  const active = item.status === 'mailpulse_active'

  async function onSync() {
    setSyncing(true)
    try {
      await sync({ opportunityId: item._id })
      toast.success('Statut MailPulse synchronisé')
    } catch {
      toast.error('Impossible de synchroniser MailPulse')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div
      className={`group flex flex-col gap-3 rounded-[var(--radius)] border p-3.5 shadow-[var(--shadow-card)] sm:flex-row sm:items-start ${mailpulsePanelClassName}`}
    >
      <MailPulseLogo />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <MailPulseWordmark className="text-sm" showLogo={false} />
          <Badge variant={active ? 'success' : 'warning'}>
            {active ? (
              <ShieldCheck className="size-3" />
            ) : (
              <Clock3 className="size-3" />
            )}
            {active ? 'Actif' : 'En attente'}
          </Badge>
        </div>

        <p className="mt-2 text-sm font-medium text-fg">
          Recouvrement client
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg-muted">
          <span className="inline-flex min-w-0 items-center gap-1">
            <Target className="size-3.5 shrink-0 text-fg-subtle" />
            <Link
              to="/app/opportunites"
              search={{ view: 'liste', id: item._id }}
              className="truncate hover:text-fg hover:underline"
            >
              {item.title}
            </Link>
          </span>
          {item.compensation && <span>{item.compensation}</span>}
          {item.deadline && <span>Échéance : {formatShortDate(item.deadline)}</span>}
        </div>

        {(item.mailpulseContactId || item.mailpulseSequenceId) && (
          <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px] text-fg-subtle">
            {item.mailpulseContactId && (
              <span>contact:{item.mailpulseContactId}</span>
            )}
            {item.mailpulseSequenceId && (
              <span>séquence:{item.mailpulseSequenceId}</span>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={syncing}
        className="border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-900/70 dark:text-orange-300 dark:hover:bg-orange-950/30"
      >
        {syncing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        Synchroniser
      </Button>
    </div>
  )
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
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
