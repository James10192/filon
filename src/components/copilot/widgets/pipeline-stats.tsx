import { m } from '~/lib/paraglide/messages'
import { ProgressBar } from '~/components/ui/progress-bar'
import { STAGE_META, STAGES } from '~/components/opportunities/meta'
import { Card, EmptyHint } from './primitives'

/**
 * Widget « résumé du pipeline » : trois tuiles (total / actives / gagnées) puis
 * une barre par étape non vide. Rend les outils `summarize_pipeline` et
 * `pipeline_stats`.
 */

export type PipelineData = {
  total: number
  active: number
  won: number
  byStage: Record<string, number>
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <span
        className={`assay text-xl font-semibold ${accent ? 'text-success' : 'text-fg'}`}
      >
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
    </div>
  )
}

export function PipelineSummary({ data }: { data: PipelineData }) {
  const max = Math.max(1, ...Object.values(data.byStage ?? {}))
  const stages = STAGES.filter((s) => (data.byStage?.[s] ?? 0) > 0)
  return (
    <Card>
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <Stat label={m.app_tool_pipeline_total()} value={data.total} />
        <Stat label={m.app_tool_pipeline_active()} value={data.active} />
        <Stat label={m.app_tool_pipeline_won()} value={data.won} accent />
      </div>
      {data.total === 0 ? (
        <EmptyHint text={m.app_tool_pipeline_empty()} />
      ) : (
        <div className="space-y-2 p-3.5">
          {stages.map((s) => {
            const n = data.byStage[s] ?? 0
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs text-fg-muted">
                  {STAGE_META[s].label}
                </span>
                <ProgressBar
                  percent={(n / max) * 100}
                  className="flex-1"
                  barClassName={s === 'won' ? 'bg-success' : 'bg-accent'}
                />
                <span className="assay w-6 shrink-0 text-right text-xs font-medium text-fg">
                  {n}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
