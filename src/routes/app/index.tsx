import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { AlertTriangle, Compass, Plus, RotateCcw } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
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
import { RecentActivity } from '~/components/dashboard/recent-activity'

export const Route = createFileRoute('/app/')({
  component: DashboardPage,
  errorComponent: DashboardError,
  head: () => ({ meta: [{ title: 'Tableau de bord · Filon' }] }),
})

function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Tableau de bord"
        subtitle="Vos priorités du jour et la forme de votre pipeline."
      />
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-danger/40 bg-danger-soft px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface text-danger">
          <AlertTriangle className="size-6" />
        </span>
        <div className="flex max-w-sm flex-col gap-1.5">
          <h2 className="text-base font-semibold text-fg">
            Impossible de charger le tableau de bord
          </h2>
          <p className="text-sm text-fg-muted">
            Une erreur est survenue lors du chargement de vos indicateurs.
            Réessayez dans un instant.
          </p>
        </div>
        <Button variant="secondary" onClick={reset}>
          <RotateCcw className="size-4" />
          Réessayer
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
        title="Tableau de bord"
        subtitle="Vos priorités du jour et la forme de votre pipeline."
        actions={
          <Button onClick={quickCapture.open}>
            <Plus className="size-4" />
            Nouvelle opportunité
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Hero : entonnoir du pipeline (compte + valeur par étape) */}
        <PipelineFunnel />

        {/* Priorités du jour + activité récente */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TodayStack />
          <RecentActivity />
        </div>

        {/* KPI secondaires compacts */}
        <SecondaryKpis summary={summary} />
      </div>
    </div>
  )
}

function OnboardingState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Tableau de bord"
        subtitle="Vos priorités du jour et la forme de votre pipeline."
        actions={
          <Button onClick={onCreate}>
            <Plus className="size-4" />
            Nouvelle opportunité
          </Button>
        }
      />
      <div className="flex flex-col items-center gap-5 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-14 text-center shadow-[var(--shadow-card)]">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Compass className="size-6" />
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-fg">
            Ajoutez votre première opportunité
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
            Nouvelle opportunité
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/app/pipeline">Voir le pipeline</Link>
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
        title="Tableau de bord"
        subtitle="Vos priorités du jour et la forme de votre pipeline."
      />
      <div className="flex flex-col gap-5">
        <PipelineFunnelSkeleton />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TodayStackSkeleton />
          <TodayStackSkeleton />
        </div>
        <SecondaryKpisSkeleton />
      </div>
    </div>
  )
}
