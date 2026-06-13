import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import {
  Target,
  Send,
  Users as UsersIcon,
  Trophy,
  Percent,
  AlertTriangle,
  Compass,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { KpiCard, KpiCardSkeleton } from '~/components/dashboard/kpi-card'
import {
  StageBreakdown,
  StageBreakdownSkeleton,
} from '~/components/dashboard/stage-breakdown'
import { FollowupsDue } from '~/components/dashboard/followups-due'
import { RecentActivity } from '~/components/dashboard/recent-activity'
import { formatPercent } from '~/components/dashboard/pipeline-meta'

export const Route = createFileRoute('/app/')({
  component: DashboardPage,
  errorComponent: DashboardError,
  head: () => ({ meta: [{ title: 'Tableau de bord · Filon' }] }),
})

function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
        Tableau de bord
      </h1>
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

  if (summary === undefined) return <DashboardSkeleton />

  // Onboarding : aucune opportunité encore créée.
  if (summary.totalOpportunities === 0) return <OnboardingState />

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            Tableau de bord
          </h1>
          <p className="text-sm text-fg-muted">
            Vue d'ensemble de votre pipeline et de vos actions du jour.
          </p>
        </div>
        <Button asChild>
          <Link to="/app/opportunites">
            <Plus className="size-4" />
            Ajouter une opportunité
          </Link>
        </Button>
      </header>

      <section
        aria-label="Indicateurs clés"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Opportunités actives"
          value={summary.activeCount}
          icon={Target}
          tone="accent"
          hint={`${summary.totalOpportunities} au total`}
        />
        <KpiCard
          label="Candidatures envoyées"
          value={summary.byStage.applied}
          icon={Send}
          hint={`${summary.proposalsSent} proposition${summary.proposalsSent > 1 ? 's' : ''} envoyée${summary.proposalsSent > 1 ? 's' : ''}`}
        />
        <KpiCard
          label="Entretiens"
          value={summary.byStage.interview}
          icon={UsersIcon}
          hint={`${summary.byStage.negotiation} en négociation`}
        />
        <KpiCard
          label="Taux de conversion"
          value={formatPercent(summary.winRate)}
          icon={Percent}
          tone={summary.winRate >= 0.5 ? 'success' : 'neutral'}
          hint={`${summary.wonCount} gagnée${summary.wonCount > 1 ? 's' : ''} · ${summary.lostCount} perdue${summary.lostCount > 1 ? 's' : ''}`}
        />
        <KpiCard
          label="Gagnées"
          value={summary.wonCount}
          icon={Trophy}
          tone="success"
          hint="Postes et contrats obtenus"
        />
        <KpiCard
          label="Relances du jour"
          value={summary.followupsUpcoming}
          icon={Send}
          tone={summary.followupsUpcoming > 0 ? 'warning' : 'neutral'}
          hint="À faire sous 7 jours"
        />
        <KpiCard
          label="Relances en retard"
          value={summary.followupsOverdue}
          icon={AlertTriangle}
          tone={summary.followupsOverdue > 0 ? 'danger' : 'neutral'}
          hint={
            summary.followupsOverdue > 0 ? 'À traiter en priorité' : 'Tout est à jour'
          }
        />
        <KpiCard
          label="Carnet"
          value={summary.companiesCount}
          icon={UsersIcon}
          hint={`${summary.contactsCount} contact${summary.contactsCount > 1 ? 's' : ''} · ${summary.documentsCount} document${summary.documentsCount > 1 ? 's' : ''}`}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <FollowupsDue />
          <RecentActivity />
        </div>
        <div className="flex flex-col gap-6">
          <StageBreakdown byStage={summary.byStage} />
        </div>
      </section>
    </div>
  )
}

function OnboardingState() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
        Tableau de bord
      </h1>
      <div className="flex flex-col items-center gap-5 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Compass className="size-7" />
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-lg font-semibold text-fg">
            Ajoutez votre première opportunité
          </h2>
          <p className="text-sm text-fg-muted">
            Aucune opportunité pour l'instant. Ajoutez votre première piste pour
            voir vos indicateurs, vos relances et votre activité s'animer ici.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/app/opportunites">
            <Plus className="size-4" />
            Ajouter une opportunité
          </Link>
        </Button>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
          Tableau de bord
        </h1>
        <p className="text-sm text-fg-muted">
          Vue d'ensemble de votre pipeline et de vos actions du jour.
        </p>
      </header>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <StageBreakdownSkeleton />
        </div>
        <div className="flex flex-col gap-6">
          <StageBreakdownSkeleton />
        </div>
      </section>
    </div>
  )
}
