import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
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
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Skeleton } from '~/components/ui/skeleton'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { PageToolbar } from '~/components/app/page-toolbar'
import { FollowupItem, type Followup } from '~/components/relances/followup-item'
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
import { MailPulseStatusBadge } from '~/components/mailpulse/mailpulse-status-badge'
import type { MailPulseSettings } from '~/components/mailpulse/types'

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
  const mailpulseSettings = useQuery(api.settings.get, {}) as
    | MailPulseSettings
    | undefined

  return (
    <div className="flex flex-col">
      <PageToolbar
        title={m.dash_relances_title()}
        subtitle={m.dash_relances_subtitle()}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              base="relances"
              rows={groups ? flattenGroups(groups) : []}
              columns={FOLLOWUP_COLUMNS}
            />
            <NewFollowupDialog />
          </div>
        }
      />
      {groups === undefined ||
      mailpulseRecoveries === undefined ||
      mailpulseSettings === undefined ? (
        <LoadingState />
      ) : (
        <Content
          groups={groups}
          mailpulseRecoveries={mailpulseRecoveries}
          mailpulseSettings={mailpulseSettings}
        />
      )}
    </div>
  )
}

function Content({
  groups,
  mailpulseRecoveries,
  mailpulseSettings,
}: {
  groups: DueGroups
  mailpulseRecoveries: MailPulseRecovery[]
  mailpulseSettings: MailPulseSettings
}) {
  const urgentCount = groups.overdue.length + groups.today.length
  const upcomingCount = groups.thisWeek.length + groups.later.length

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <main className="min-w-0 space-y-10">
        <PrioritySection groups={groups} count={urgentCount} />
        <RecoveryDashboardSection />
      </main>

      <aside className="min-w-0 space-y-8 xl:sticky xl:top-20">
        <UpcomingSection groups={groups} count={upcomingCount} />
        <MailPulseRecoverySection
          items={mailpulseRecoveries}
          settings={mailpulseSettings}
        />
      </aside>
    </div>
  )
}

function PrioritySection({ groups, count }: { groups: DueGroups; count: number }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="priority-heading">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-danger-soft text-danger">
              <BellRing className="size-4" />
            </span>
            <h2 id="priority-heading" className="text-base font-semibold text-fg">
              À traiter maintenant
            </h2>
            <Badge variant={count > 0 ? 'danger' : 'outline'} className="assay">
              {count}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-fg-muted">
            Les actions en retard ou prévues aujourd'hui passent en premier.
          </p>
        </div>
      </header>

      {count === 0 ? (
        <PriorityEmptyState />
      ) : (
        <div className="space-y-3">
          <FollowupGroup
            title={m.dash_relances_section_overdue()}
            tone="danger"
            items={groups.overdue}
            icon={<AlertTriangle className="size-4" />}
          />
          <FollowupGroup
            title={m.dash_relances_section_today()}
            tone="warning"
            items={groups.today}
            icon={<BellRing className="size-4" />}
          />
        </div>
      )}
    </section>
  )
}

function UpcomingSection({ groups, count }: { groups: DueGroups; count: number }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="upcoming-heading">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="size-4 text-fg-subtle" />
          <h2 id="upcoming-heading" className="text-sm font-semibold text-fg">
            À venir
          </h2>
        </div>
        <Badge variant="outline" className="assay">
          {count}
        </Badge>
      </header>

      {count === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed bg-surface px-4 py-5 text-sm text-fg-muted">
          Aucune échéance planifiée après aujourd'hui.
        </p>
      ) : (
        <div className="space-y-3">
          <FollowupGroup
            title={m.dash_relances_section_week()}
            tone="neutral"
            items={groups.thisWeek}
          />
          <FollowupGroup
            title={m.dash_relances_section_later()}
            tone="neutral"
            items={groups.later}
          />
        </div>
      )}
    </section>
  )
}

function FollowupGroup({
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
  const variant = tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'outline'

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
        <span className={tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-fg-subtle'}>
          {icon}
        </span>
        <h3 className="text-sm font-medium text-fg">{title}</h3>
        <Badge variant={variant} className="assay ml-auto">
          {items.length}
        </Badge>
      </div>
      <div className="divide-y divide-border">
        {items.map((followup) => (
          <FollowupItem key={followup._id} followup={followup} variant="row" />
        ))}
      </div>
    </div>
  )
}

function MailPulseRecoverySection({
  items,
  settings,
}: {
  items: MailPulseRecovery[]
  settings: MailPulseSettings
}) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="mailpulse-heading">
      <header>
        <div className="flex items-start justify-between gap-3">
          <h2 id="mailpulse-heading">
            <MailPulseWordmark className="text-sm" />
          </h2>
          <MailPulseStatusBadge status={settings.mailpulseConnectionStatus} />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">
            Canal automatisé pour les dossiers de recouvrement.
          </p>
          <Badge
            variant="outline"
            className="assay shrink-0 border-orange-200 text-orange-700 dark:border-orange-900 dark:text-orange-300"
          >
            {items.length}
          </Badge>
        </div>
      </header>

      {items.length === 0 ? (
        <MailPulseRecoveryEmptyCard settings={settings} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <MailPulseRecoveryItem key={item._id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

function MailPulseRecoveryEmptyCard({ settings }: { settings: MailPulseSettings }) {
  const configured = isMailPulseConfigured(settings)
  const pending = settings.mailpulseConnectionStatus === 'pending'
  const ctaLabel = configured
    ? 'Voir les préférences MailPulse'
    : pending
      ? 'Finaliser MailPulse'
      : 'Configurer MailPulse'

  return (
    <div className={`rounded-[var(--radius-lg)] border p-4 ${mailpulsePanelClassName}`}>
      <div className="flex items-start gap-3">
        <MailPulseLogo className="size-8" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">
            {configured ? 'MailPulse est prêt' : 'Aucun dossier automatisé'}
          </p>
          <p className="mt-1.5 text-sm text-fg-muted">
            {configured
              ? 'La connexion est active. Lancez MailPulse depuis une opportunité gagnée.'
              : 'Lancez MailPulse depuis une opportunité gagnée lorsque le client doit être relancé.'}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        asChild
        className="mt-4 w-full border-orange-200 text-orange-700 transition-[background-color,box-shadow,scale] active:scale-[0.96] hover:bg-orange-100 dark:border-orange-900/70 dark:text-orange-300 dark:hover:bg-orange-950/30"
      >
        <Link
          to="/app/parametres"
          search={{ tab: 'preferences', focus: 'mailpulse' }}
        >
          <Settings className="size-4" />
          {ctaLabel}
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
    <article className={`rounded-[var(--radius-lg)] border p-4 ${mailpulsePanelClassName}`}>
      <div className="flex items-start gap-2.5">
        <MailPulseLogo className="size-7" />
        <div className="min-w-0 flex-1">
          <Link
            to="/app/opportunites"
            search={{ view: 'liste', id: item._id }}
            className="block truncate text-sm font-semibold text-fg hover:underline"
          >
            {item.title}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={active ? 'success' : 'warning'}>
              {active ? <ShieldCheck className="size-3" /> : <Clock3 className="size-3" />}
              {active ? 'Actif' : 'En attente'}
            </Badge>
            {item.deadline && (
              <span className="assay-meta">{formatShortDate(item.deadline)}</span>
            )}
          </div>
        </div>
      </div>

      {item.compensation && (
        <p className="assay mt-3 text-xs font-medium text-fg">{item.compensation}</p>
      )}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-fg-muted">
        <Target className="size-3.5 shrink-0 text-fg-subtle" />
        <span>Recouvrement client</span>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onSync}
        disabled={syncing}
        className="mt-4 w-full border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-900/70 dark:text-orange-300 dark:hover:bg-orange-950/30"
      >
        {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Synchroniser
      </Button>
    </article>
  )
}

function PriorityEmptyState() {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-dashed bg-surface px-4 py-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-success-soft text-success">
        <CheckCircle2 className="size-5" />
      </span>
      <div>
        <p className="text-sm font-medium text-fg">Aucune relance urgente</p>
        <p className="mt-1 text-sm text-fg-muted">
          Les prochaines échéances restent visibles dans la colonne À venir.
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-10">
        {[0, 1].map((section) => (
          <section key={section} className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-36 rounded-[var(--radius-lg)]" />
          </section>
        ))}
      </div>
      <div className="space-y-8">
        <Skeleton className="h-44 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-52 rounded-[var(--radius-lg)]" />
      </div>
    </div>
  )
}

function flattenGroups(groups: DueGroups) {
  return [...groups.overdue, ...groups.today, ...groups.thisWeek, ...groups.later]
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

function isMailPulseConfigured(settings: MailPulseSettings) {
  return (
    settings.mailpulseConnectionStatus === 'linked' &&
    Boolean(settings.mailpulseBaseUrl?.trim()) &&
    Boolean(settings.mailpulseApiKeySet)
  )
}
