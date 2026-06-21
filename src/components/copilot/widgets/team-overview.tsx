import { Users, Flag } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Card, EmptyHint, Header } from './primitives'

/**
 * Widget « aperçu d'équipe » (manager) : totaux de l'organisation puis une ligne
 * par membre (actives / gagnées / taux de conversion), et la liste des
 * opportunités pointées prioritaires. Rend l'outil `team_overview`. Typé sur la
 * sortie de l'outil ; aucun code interne affiché.
 */

type MemberRow = {
  userId: string
  name: string | null
  email: string
  role: string
  metrics: {
    total: number
    active: number
    won: number
    conversion: number
    overdueFollowups: number
  }
}

export type TeamOverviewData = {
  orgName: string | null
  memberCount: number
  totals: { total: number; active: number; won: number; flagged: number }
  members: MemberRow[]
  flagged: Array<{
    id: string
    title: string
    ownerName: string | null
    note: string | null
  }>
} | null

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <span className="assay text-xl font-semibold text-fg">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
    </div>
  )
}

export function TeamOverview({ data }: { data: TeamOverviewData }) {
  if (!data) {
    return (
      <Card>
        <EmptyHint text={m.app_tool_team_not_manager()} />
      </Card>
    )
  }
  return (
    <div className="space-y-2.5">
      <Card>
        <Header
          icon={Users}
          label={data.orgName ?? m.app_tool_team_overview_label()}
        />
        <div className="grid grid-cols-3 divide-x divide-border">
          <Stat label={m.app_tool_team_active()} value={data.totals.active} />
          <Stat label={m.app_tool_team_won()} value={data.totals.won} />
          <Stat label={m.app_tool_team_flagged()} value={data.totals.flagged} />
        </div>
        {data.members.length === 0 ? (
          <EmptyHint text={m.app_tool_team_no_members()} />
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {data.members.slice(0, 10).map((mem) => (
              <li
                key={mem.userId}
                className="flex items-center gap-2.5 px-3.5 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {mem.name ?? mem.email}
                </span>
                <span className="assay shrink-0 text-xs text-fg-muted">
                  {m.app_tool_team_member_stats({
                    active: mem.metrics.active,
                    won: mem.metrics.won,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {data.flagged.length > 0 && (
        <Card>
          <Header icon={Flag} label={m.app_tool_team_flagged_list()} />
          <ul className="divide-y divide-border">
            {data.flagged.slice(0, 6).map((f) => (
              <li key={f.id} className="px-3.5 py-2.5">
                <p className="truncate text-sm text-fg">{f.title}</p>
                <p className="truncate text-xs text-fg-subtle">
                  {f.ownerName ?? ''}
                  {f.note ? ` · ${f.note}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
