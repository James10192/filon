import { useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import {
  ArrowRight,
  CircleDollarSign,
  Clock3,
  Gauge,
  Goal,
  TrendingUp,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { PageToolbar } from '~/components/app/page-toolbar'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { parseCompensation } from '~/components/pipeline/pipeline-meta'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/app/analyses')({
  component: AnalysesPage,
  head: () => ({ meta: [{ title: 'Analyses · Filon' }] }),
})

const STAGES = [
  { key: 'lead', label: 'Prospection', color: 'var(--color-stage-lead)' },
  { key: 'contacted', label: 'Qualification', color: 'var(--color-stage-contacted)' },
  { key: 'applied', label: 'Proposition', color: 'var(--color-stage-applied)' },
  { key: 'interview', label: 'Rendez-vous', color: 'var(--color-stage-interview)' },
  { key: 'negotiation', label: 'Négociation', color: 'var(--color-stage-negotiation)' },
  { key: 'won', label: 'Closing', color: 'var(--color-stage-won)' },
] as const

function AnalysesPage() {
  const opportunities = useQuery(api.opportunities.list, {})

  const model = useMemo(() => {
    if (!opportunities) return null
    const now = Date.now()
    const active = opportunities.filter(
      (deal) => deal.stage !== 'won' && deal.stage !== 'lost',
    )
    const won = opportunities.filter((deal) => deal.stage === 'won')
    const lost = opportunities.filter((deal) => deal.stage === 'lost')
    const closed = won.length + lost.length
    const value = active.reduce(
      (sum, deal) => sum + parseCompensation(deal.compensation),
      0,
    )
    const risks = active
      .map((deal) => {
        const dueAt = deal.nextActionAt
          ? new Date(deal.nextActionAt).getTime()
          : null
        const overdue = dueAt !== null && Number.isFinite(dueAt) && dueAt < now
        const missingAction = !deal.nextActionAt
        const stale = now - deal.updatedAt > 10 * 24 * 60 * 60 * 1000
        const score = Number(overdue) * 4 + Number(missingAction) * 2 + Number(stale)
        return { deal, overdue, missingAction, stale, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    const stageCounts = STAGES.map((stage) => ({
      ...stage,
      count: opportunities.filter((deal) => deal.stage === stage.key).length,
    }))

    return {
      active: active.length,
      value,
      overdue: risks.filter((item) => item.overdue).length,
      closeRate: closed > 0 ? Math.round((won.length / closed) * 100) : 0,
      won: won.length,
      lost: lost.length,
      stageCounts,
      risks,
    }
  }, [opportunities])

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Analyses"
        subtitle="Comprenez où se crée le revenu et ce qui bloque la progression."
        actions={
          <Button asChild>
            <Link to="/app/deals">
              Ouvrir les deals
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      {!model ? <AnalysesSkeleton /> : <AnalysesContent model={model} />}
    </div>
  )
}

type AnalysisModel = NonNullable<
  ReturnType<typeof useAnalysisModelPlaceholder>
>

function useAnalysisModelPlaceholder() {
  return null as null | {
    active: number
    value: number
    overdue: number
    closeRate: number
    won: number
    lost: number
    stageCounts: Array<(typeof STAGES)[number] & { count: number }>
    risks: Array<{
      deal: {
        _id: string
        title: string
        stage: string
        compensation?: string
      }
      overdue: boolean
      missingAction: boolean
      stale: boolean
      score: number
    }>
  }
}

function AnalysesContent({ model }: { model: AnalysisModel }) {
  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 gap-0 overflow-hidden p-0 shadow-none lg:grid-cols-4">
        <Metric icon={Gauge} value={String(model.active)} label="Deals actifs" values={model.stageCounts.map((stage) => stage.count)} className="border-b border-r lg:border-b-0" />
        <Metric icon={CircleDollarSign} value={formatXof(model.value)} label="Valeur en mouvement" values={model.stageCounts.slice(0, 5).map((stage) => stage.count)} className="border-b lg:border-b-0 lg:border-r" />
        <Metric icon={Clock3} value={String(model.overdue)} label="Relances en retard" values={[model.active - model.overdue, model.overdue]} className="border-r" />
        <Metric icon={Goal} value={`${model.closeRate} %`} label="Taux de closing" values={[model.lost, model.won]} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.85fr)]">
        <Card className="overflow-hidden p-0 shadow-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold text-fg">Progression du pipeline</h2>
              <p className="mt-1 text-sm text-fg-muted">Volume réel par étape, du premier signal au closing.</p>
            </div>
            <TrendingUp className="size-5 text-accent" />
          </div>
          <StageDistribution stages={model.stageCounts} />
        </Card>

        <Card className="overflow-hidden p-0 shadow-none">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-fg">Santé du closing</h2>
            <p className="mt-1 text-sm text-fg-muted">Résultats des deals arrivés à décision.</p>
          </div>
          <ClosingHealth rate={model.closeRate} won={model.won} lost={model.lost} />
        </Card>
      </div>

      <Card className="overflow-hidden p-0 shadow-none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-fg">Deals qui demandent une décision</h2>
            <p className="mt-1 text-sm text-fg-muted">Relances dépassées, absence de prochaine action ou activité trop ancienne.</p>
          </div>
          <span className="assay text-sm font-semibold tabular-nums text-fg-muted">{model.risks.length}</span>
        </div>
        <RiskList risks={model.risks} />
      </Card>
    </div>
  )
}

function Metric({ icon: Icon, value, label, values, className }: { icon: typeof Gauge; value: string; label: string; values: number[]; className?: string }) {
  const max = Math.max(...values, 1)
  return (
    <section className={cn('flex min-h-28 items-center justify-center gap-4 px-4 py-3', className)}>
      <span className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent"><Icon className="size-[18px]" /></span>
      <div className="text-center">
        <p className="assay text-xl font-semibold tabular-nums text-fg">{value}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{label}</p>
        <div className="mt-2 flex h-3 items-end justify-center gap-0.5" aria-hidden>
          {values.map((item, index) => <span key={`${index}-${item}`} className="w-2 rounded-[2px] bg-accent/70" style={{ height: `${Math.max(18, (item / max) * 100)}%` }} />)}
        </div>
      </div>
    </section>
  )
}

function StageDistribution({ stages }: { stages: AnalysisModel['stageCounts'] }) {
  const max = Math.max(...stages.map((stage) => stage.count), 1)
  return (
    <div className="divide-y divide-border">
      {stages.map((stage) => (
        <div key={stage.key} className="grid grid-cols-[7rem_minmax(0,1fr)_2rem] items-center gap-4 px-5 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)_2rem]">
          <span className="flex items-center gap-2 text-sm font-medium text-fg"><span className="size-2 rounded-full" style={{ background: stage.color }} />{stage.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${stage.count === 0 ? 0 : Math.max(6, (stage.count / max) * 100)}%`, background: stage.color }} /></div>
          <span className="assay text-right text-sm font-semibold tabular-nums text-fg">{stage.count}</span>
        </div>
      ))}
    </div>
  )
}

function ClosingHealth({ rate, won, lost }: { rate: number; won: number; lost: number }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
      <div className="grid size-32 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-accent) ${rate * 3.6}deg, var(--color-surface-2) 0deg)` }}>
        <div className="grid size-24 place-items-center rounded-full bg-surface"><div><p className="assay text-2xl font-semibold tabular-nums text-fg">{rate} %</p><p className="text-xs text-fg-muted">convertis</p></div></div>
      </div>
      <div className="mt-6 grid w-full grid-cols-2 divide-x divide-border border-y border-border py-3">
        <div><p className="assay font-semibold tabular-nums text-fg">{won}</p><p className="text-xs text-fg-muted">closings gagnés</p></div>
        <div><p className="assay font-semibold tabular-nums text-fg">{lost}</p><p className="text-xs text-fg-muted">deals perdus</p></div>
      </div>
    </div>
  )
}

function RiskList({ risks }: { risks: AnalysisModel['risks'] }) {
  if (risks.length === 0) return <div className="px-5 py-10 text-center"><p className="font-medium text-fg">Aucun deal sous tension</p><p className="mt-1 text-sm text-fg-muted">Chaque deal actif possède une prochaine action à jour.</p></div>
  return <div className="divide-y divide-border">{risks.map(({ deal, overdue, missingAction, stale }) => (
    <Link key={deal._id} to="/app/opportunites" search={{ view: 'liste', id: deal._id }} className="flex min-h-16 items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
      <span className={cn('size-2 rounded-full', overdue ? 'bg-danger' : 'bg-warning')} />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-fg">{deal.title}</p><p className="mt-0.5 text-xs text-fg-muted">{overdue ? 'Relance dépassée' : missingAction ? 'Aucune prochaine action' : stale ? 'Activité ancienne' : 'À vérifier'}</p></div>
      {deal.compensation && <span className="assay hidden text-xs font-semibold text-fg-muted sm:block">{deal.compensation}</span>}
      <ArrowRight className="size-4 text-fg-subtle" />
    </Link>
  ))}</div>
}

function AnalysesSkeleton() {
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-none" />)}</div><div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div><Skeleton className="h-64" /></div>
}

function formatXof(value: number): string {
  if (value >= 1_000_000) return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value / 1_000_000)} M XOF`
  if (value >= 1_000) return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value / 1_000)} k XOF`
  return `${new Intl.NumberFormat('fr-FR').format(value)} XOF`
}
