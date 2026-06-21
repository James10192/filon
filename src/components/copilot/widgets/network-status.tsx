import { Target, TrendingUp } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { ProgressBar } from '~/components/ui/progress-bar'
import { Card, EmptyHint, Header } from './primitives'

/**
 * Widget « progression réseau » : objectif de palier (filleuls actifs visés) avec
 * barre de progression, filleuls à risque, et opportunités avancées à convertir.
 * Rend `network_status` et `set_rank_goal`. Aucun chiffre recopié de l'entreprise.
 */

export type NetworkStatusData = {
  goalLabel: string | null
  target: number | null
  activeCount: number
  atRiskCount: number
  remaining: number | null
  inFlight: number
  focus: Array<{ id: string; title: string }>
}

export function NetworkStatus({ data }: { data: NetworkStatusData }) {
  const hasGoal = data.target !== null && data.target > 0
  const percent = hasGoal
    ? Math.min(100, (data.activeCount / data.target!) * 100)
    : 0
  return (
    <div className="space-y-2.5">
      <Card>
        <Header
          icon={Target}
          label={data.goalLabel ?? m.app_tool_network_label()}
        />
        <div className="space-y-2.5 p-3.5">
          {hasGoal ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="assay text-2xl font-semibold text-fg">
                  {data.activeCount}
                  <span className="text-base text-fg-subtle"> / {data.target}</span>
                </span>
                {data.remaining !== null && data.remaining > 0 && (
                  <span className="text-xs text-fg-muted">
                    {m.app_tool_network_remaining({ n: data.remaining })}
                  </span>
                )}
              </div>
              <ProgressBar percent={percent} barClassName="bg-accent" />
            </>
          ) : (
            <p className="text-sm text-fg-muted">
              {m.app_tool_network_no_goal({ n: data.activeCount })}
            </p>
          )}
          {data.atRiskCount > 0 && (
            <p className="text-xs text-warning">
              {m.app_tool_network_at_risk({ n: data.atRiskCount })}
            </p>
          )}
        </div>
      </Card>
      {data.focus.length > 0 && (
        <Card>
          <Header icon={TrendingUp} label={m.app_tool_network_focus()} />
          <ul className="divide-y divide-border">
            {data.focus.slice(0, 5).map((o) => (
              <li
                key={o.id}
                className="truncate px-3.5 py-2.5 text-sm text-fg"
              >
                {o.title}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {!data.focus.length && !hasGoal && data.activeCount === 0 && (
        <Card>
          <EmptyHint text={m.app_tool_network_empty()} />
        </Card>
      )}
    </div>
  )
}
