import { m } from '~/lib/paraglide/messages'
import { STAGE_COLOR_VAR, formatCompactValue, formatNumber, type Stage } from './pipeline-meta'

type FunnelDatum = {
  stage: Stage
  label: string
  count: number
  value: number
}

type Props = {
  active?: boolean
  payload?: Array<{ payload?: FunnelDatum }>
}

/**
 * Infobulle de l'entonnoir : libellé d'étape, compte et valeur cumulée
 * (assay-mono). Invite au drill-down vers le pipeline.
 */
export function FunnelTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) return null
  const datum = payload[0]?.payload
  if (!datum) return null

  return (
    <div className="min-w-[10rem] rounded-[var(--radius)] border border-border bg-surface px-3 py-2 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: STAGE_COLOR_VAR[datum.stage] }}
          aria-hidden
        />
        <span className="text-sm font-medium text-fg">{datum.label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-4">
        <span className="text-xs text-fg-muted">{m.dash_tooltip_opportunities()}</span>
        <span className="assay text-sm font-semibold text-fg">
          {formatNumber(datum.count)}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-4">
        <span className="text-xs text-fg-muted">{m.dash_tooltip_value()}</span>
        <span className="assay text-sm text-fg">
          {datum.value > 0 ? `${formatCompactValue(datum.value)} XOF` : '·'}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-fg-subtle">{m.dash_tooltip_click_hint()}</p>
    </div>
  )
}
