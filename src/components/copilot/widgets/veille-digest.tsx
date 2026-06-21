import { Radar, FileSearch } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Card, EmptyHint, Header } from './primitives'

/**
 * Widget « récap veille » : mots-clés surveillés (avec état actif/inactif) et
 * opportunités récemment captées (entonnoir captées/actives/gagnées/perdues).
 * Rend l'outil `veille_digest`. Lecture seule (pas d'import de capture).
 */

export type VeilleDigestData = {
  searches: Array<{
    id: string
    name: string | null
    keywords: string[]
    enabled: boolean
  }>
  funnel: { captured: number; active: number; won: number; lost: number }
  recent: Array<{ id: string; title: string; source: string | null }>
}

function FunnelStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2.5">
      <span className="assay text-lg font-semibold text-fg">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
    </div>
  )
}

export function VeilleDigest({ data }: { data: VeilleDigestData }) {
  return (
    <div className="space-y-2.5">
      <Card>
        <Header icon={Radar} label={m.app_tool_veille_label()} />
        <div className="grid grid-cols-4 divide-x divide-border">
          <FunnelStat
            label={m.app_tool_veille_captured()}
            value={data.funnel.captured}
          />
          <FunnelStat
            label={m.app_tool_veille_active()}
            value={data.funnel.active}
          />
          <FunnelStat label={m.app_tool_veille_won()} value={data.funnel.won} />
          <FunnelStat label={m.app_tool_veille_lost()} value={data.funnel.lost} />
        </div>
        {data.searches.length === 0 ? (
          <EmptyHint text={m.app_tool_veille_no_searches()} />
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {data.searches.slice(0, 6).map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 px-3.5 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {s.name ?? s.keywords.join(', ')}
                </span>
                {!s.enabled && (
                  <span className="shrink-0 text-[11px] text-fg-subtle">
                    {m.app_tool_veille_paused()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {data.recent.length > 0 && (
        <Card>
          <Header icon={FileSearch} label={m.app_tool_veille_recent()} />
          <ul className="divide-y divide-border">
            {data.recent.slice(0, 6).map((o) => (
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
    </div>
  )
}
