import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import {
  STAGE_COLOR_VAR,
  STAGE_LABEL,
  STAGE_ORDER,
  formatNumber,
  type Stage,
} from './pipeline-meta'

interface StageBreakdownProps {
  byStage: Record<Stage, number>
}

/**
 * Mini répartition des opportunités par stage : barre horizontale proportionnelle
 * par stage, couleur d'identification du stage. Lecture rapide de la forme du pipeline.
 */
export function StageBreakdown({ byStage }: StageBreakdownProps) {
  const total = STAGE_ORDER.reduce((sum, s) => sum + (byStage[s] ?? 0), 0)
  const max = STAGE_ORDER.reduce(
    (m, s) => Math.max(m, byStage[s] ?? 0),
    0,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition par étape</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {STAGE_ORDER.map((stage) => {
          const count = byStage[stage] ?? 0
          const pct = max > 0 ? Math.round((count / max) * 100) : 0
          return (
            <div key={stage} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STAGE_COLOR_VAR[stage] }}
                    aria-hidden
                  />
                  <span className="truncate text-fg-muted">
                    {STAGE_LABEL[stage]}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums text-fg">
                  {formatNumber(count)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: STAGE_COLOR_VAR[stage],
                  }}
                />
              </div>
            </div>
          )
        })}
        {total === 0 && (
          <p className="text-sm text-fg-subtle">
            Aucune opportunité pour l'instant.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/** Squelette de la répartition par étape (état loading). */
export function StageBreakdownSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-6" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
