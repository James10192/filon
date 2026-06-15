import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { AlertTriangle, Compass, Plus, RotateCcw } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { PageToolbar } from '~/components/app/page-toolbar'
import { useQuickCapture } from '~/components/app/quick-capture'
import {
  PipelineFunnel,
  PipelineFunnelSkeleton,
} from '~/components/dashboard/pipeline-funnel'
import { TodayStack, TodayStackSkeleton } from '~/components/dashboard/today-stack'
import {
  SecondaryKpis,
  SecondaryKpisSkeleton,
} from '~/components/dashboard/secondary-kpis'
import { KpiRow, KpiRowSkeleton } from '~/components/dashboard/kpi-row'
import {
  RecentActivity,
  RecentActivitySkeleton,
} from '~/components/dashboard/recent-activity'
import { DashboardNudge } from '~/components/dashboard/dashboard-nudge'
import { DailySuggestions } from '~/components/dashboard/daily-suggestions'
import { AskCopilotButton } from '~/components/copilot/ask-copilot-button'

export const Route = createFileRoute('/app/')({
  component: DashboardPage,
  errorComponent: DashboardError,
  head: () => ({ meta: [{ title: 'Tableau de bord · Filon' }] }),
})

function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col">
      <PageToolbar
        title={m.dashboard_title()}
        subtitle={m.dashboard_subtitle()}
      />
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-danger/40 bg-danger-soft px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface text-danger">
          <AlertTriangle className="size-6" />
        </span>
        <div className="flex max-w-sm flex-col gap-1.5">
          <h2 className="text-base font-semibold text-fg">
            {m.dashboard_error_title()}
          </h2>
          <p className="text-sm text-fg-muted">{m.dashboard_error_body()}</p>
        </div>
        <Button variant="secondary" onClick={reset}>
          <RotateCcw className="size-4" />
          {m.dashboard_error_retry()}
        </Button>
      </div>
    </div>
  )
}

function DashboardPage() {
  const summary = useQuery(api.dashboard.summary, {})
  const quickCapture = useQuickCapture()

  if (summary === undefined) return <DashboardSkeleton />

  // Onboarding : aucune opportunité encore créée.
  if (summary.totalOpportunities === 0) {
    return <OnboardingState onCreate={quickCapture.open} />
  }

  return (
    <div className="flex flex-col">
      <PageToolbar
        title={m.dashboard_title()}
        subtitle={m.dashboard_subtitle()}
        actions={
          <div className="flex items-center gap-2">
            <AskCopilotButton
              seed={m.copilot_seed_week()}
              buttonVariant="outline"
              size="default"
            />
            <Button onClick={quickCapture.open}>
              <Plus className="size-4" />
              {m.dashboard_new_opportunity()}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Nudge de conversion contextuel (au plus un, dismissible). */}
        <DashboardNudge />

        {/* Suggestions du jour déterministes : pistes d'action -> copilote */}
        <DailySuggestions />

        {/* Hero : entonnoir de conversion du pipeline */}
        <PipelineFunnel />

        {/* Rangée KPI : valeurs directrices + sparklines de tendance */}
        <KpiRow summary={summary} />

        {/* Prochaines actions + timeline d'activité */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TodayStack />
          <RecentActivity />
        </div>

        {/* Bande carnet : volumes cliquables */}
        <SecondaryKpis summary={summary} />
      </div>
    </div>
  )
}

function OnboardingState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col">
      <PageToolbar
        title={m.dashboard_title()}
        subtitle={m.dashboard_subtitle()}
        actions={
          <Button onClick={onCreate}>
            <Plus className="size-4" />
            {m.dashboard_new_opportunity()}
          </Button>
        }
      />
      <div className="flex flex-col items-center gap-5 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-14 text-center shadow-[var(--shadow-card)]">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Compass className="size-6" />
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-fg">
            {m.dashboard_onboarding_title()}
          </h2>
          <p className="text-sm text-fg-muted">
            Dès votre première piste, votre entonnoir, vos relances du jour et
            votre activité s'animent ici. Capture rapide avec la touche{' '}
            <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg-muted">
              n
            </kbd>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" onClick={onCreate}>
            <Plus className="size-4" />
            {m.dashboard_new_opportunity()}
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/app/opportunites" search={{ view: 'tableau' }}>
              {m.dashboard_onboarding_view_pipeline()}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col">
      <PageToolbar
        title={m.dashboard_title()}
        subtitle={m.dashboard_subtitle()}
      />
      <div className="flex flex-col gap-5">
        <PipelineFunnelSkeleton />
        <KpiRowSkeleton />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TodayStackSkeleton />
          <RecentActivitySkeleton />
        </div>
        <SecondaryKpisSkeleton />
      </div>
    </div>
  )
}
