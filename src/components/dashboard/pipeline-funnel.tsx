import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { cn } from '~/lib/utils'
import { Skeleton } from '~/components/ui/skeleton'
import {
  STAGE_COLOR_VAR,
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_SHORT,
  formatCompactValue,
  formatNumber,
  type Stage,
} from './pipeline-meta'

type FunnelStage = { stage: Stage; count: number; value: number }
type Funnel = {
  stages: FunnelStage[]
  totalCount: number
  totalValue: number
  activeCount: number
  activeValue: number
  wonValue: number
}

/**
 * Hero du tableau de bord : entonnoir du pipeline. Une rangee de segments
 * horizontaux colores par etape (proportionnels au compte), surmontee des
 * deux chiffres directeurs (volume actif, valeur potentielle). Chaque etape
 * est une ligne dense cliquable vers le pipeline filtre, affichant compte ET
 * valeur cumulee. Lit `api.dashboard.funnel`.
 */
export function PipelineFunnel() {
  const funnel = useQuery(api.dashboard.funnel, {}) as Funnel | undefined

  if (funnel === undefined) return <PipelineFunnelSkeleton />

  const { stages, totalCount, activeCount, activeValue, wonValue } = funnel
  const maxCount = stages.reduce((m, s) => Math.max(m, s.count), 0)
  // Pour la barre globale, on ne montre que les etapes peuplees.
  const segments = stages.filter((s) => s.count > 0)

  return (
    <section
      aria-label="Entonnoir du pipeline"
      className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] md:p-6"
    >
      {/* Chiffres directeurs */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <HeroStat
            label="Pipeline actif"
            value={formatNumber(activeCount)}
            hint={`${formatNumber(totalCount)} au total`}
          />
          <HeroStat
            label="Valeur potentielle"
            value={`${formatCompactValue(activeValue)}`}
            unit="XOF"
            accent
            hint={
              wonValue > 0
                ? `${formatCompactValue(wonValue)} XOF gagnés`
                : 'Sur les étapes ouvertes'
            }
          />
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <TrendingUp className="size-4.5" />
        </span>
      </div>

      {/* Barre d'entonnoir globale */}
      {segments.length > 0 ? (
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
          role="img"
          aria-label="Répartition des opportunités par étape"
        >
          {segments.map((s) => (
            <span
              key={s.stage}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(s.count / totalCount) * 100}%`,
                backgroundColor: STAGE_COLOR_VAR[s.stage],
              }}
              title={`${STAGE_LABEL[s.stage]} · ${s.count}`}
            />
          ))}
        </div>
      ) : (
        <div className="h-2.5 w-full rounded-full bg-surface-2" aria-hidden />
      )}

      {/* Detail par etape : compte + valeur, ligne cliquable */}
      <div className="flex flex-col">
        {STAGE_ORDER.map((stage) => {
          const row = stages.find((s) => s.stage === stage)
          const count = row?.count ?? 0
          const value = row?.value ?? 0
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
          return (
            <Link
              key={stage}
              to="/app/pipeline"
              className="group flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 transition-colors hover:bg-surface-2"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: STAGE_COLOR_VAR[stage] }}
                aria-hidden
              />
              <span className="w-20 shrink-0 truncate text-sm text-fg-muted sm:w-24">
                {STAGE_SHORT[stage]}
              </span>
              <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2 sm:block">
                <span
                  className="block h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: STAGE_COLOR_VAR[stage],
                  }}
                />
              </span>
              <span
                className={cn(
                  'ml-auto shrink-0 text-right text-sm font-medium tabular-nums sm:ml-0',
                  count > 0 ? 'text-fg' : 'text-fg-subtle',
                )}
              >
                {formatNumber(count)}
              </span>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-fg-subtle sm:w-24">
                {value > 0 ? `${formatCompactValue(value)} XOF` : '·'}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function HeroStat({
  label,
  value,
  unit,
  hint,
  accent,
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-3xl font-semibold tabular-nums tracking-[-0.02em]',
            accent ? 'text-accent' : 'text-fg',
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-fg-muted">{unit}</span>}
      </span>
      {hint && <span className="text-xs text-fg-muted">{hint}</span>}
    </div>
  )
}

/** Squelette du hero entonnoir (etat loading). */
export function PipelineFunnelSkeleton() {
  return (
    <section className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <Skeleton className="size-9 rounded-[var(--radius)]" />
      </div>
      <Skeleton className="h-2.5 w-full rounded-full" />
      <div className="flex flex-col gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="size-2.5 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="hidden h-1.5 flex-1 rounded-full sm:block" />
            <Skeleton className="ml-auto h-4 w-6 sm:ml-0" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </section>
  )
}
