import { useState } from 'react'
import { useMutation } from 'convex/react'
import { ChevronRight, Flag, Target } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { toast } from '~/components/ui/sonner'
import { stageLabel, type Stage } from '~/components/opportunities/meta'
import { useLensSet } from '~/components/opportunities/use-stage-labels'
import { errorMessage } from '~/lib/billing/plan'
import { Card, Header, EmptyHint } from '../widgets/primitives'
import type { BriefStalled, BriefTeamFlagged } from './types'

/** Étape active suivante (s'arrête à `negotiation` : avancer vers « won » reste manuel). */
const ACTIVE_FLOW: Stage[] = ['lead', 'contacted', 'applied', 'interview', 'negotiation']

function nextStage(stage: Stage): Stage | null {
  const idx = ACTIVE_FLOW.indexOf(stage)
  if (idx === -1 || idx >= ACTIVE_FLOW.length - 1) return null
  return ACTIVE_FLOW[idx + 1]
}

/**
 * Section « Priorités » du brief : opportunités actives sans prochaine action.
 * Action gouvernée : « faire avancer » passe l'opportunité à l'étape suivante via
 * la mutation app revalidée serveur (`opportunities.setStage`).
 */
export function BriefPriorities({ items }: { items: BriefStalled[] }) {
  const lens = useLensSet()
  const setStage = useMutation(api.opportunities.setStage)
  const [pending, setPending] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <Card>
        <Header icon={Target} label={m.brief_priorities_title()} />
        <EmptyHint text={m.brief_priorities_empty()} />
      </Card>
    )
  }

  return (
    <Card>
      <Header icon={Target} label={m.brief_priorities_title()} />
      <ul className="divide-y divide-border">
        {items.map((o) => {
          const next = nextStage(o.stage)
          return (
            <li key={o.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{o.title}</p>
                <p className="text-xs text-fg-subtle">
                  {stageLabel(o.stage, lens)}
                </p>
              </div>
              {next && (
                <button
                  type="button"
                  disabled={pending === o.id}
                  onClick={async () => {
                    setPending(o.id)
                    try {
                      await setStage({
                        id: o.id as Id<'opportunities'>,
                        stage: next,
                      })
                      toast.success(
                        m.brief_priority_advanced({
                          stage: stageLabel(next, lens),
                        }),
                      )
                    } catch (error) {
                      toast.error(errorMessage(error, m.brief_action_error()))
                    } finally {
                      setPending(null)
                    }
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                >
                  {stageLabel(next, lens)}
                  <ChevronRight className="size-3" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** Section « Priorités de l'équipe » (manager) : opportunités pointées. Lecture seule. */
export function BriefTeam({ items }: { items: BriefTeamFlagged[] }) {
  const lens = useLensSet()
  if (items.length === 0) return null
  return (
    <Card>
      <Header icon={Flag} label={m.brief_team_title()} />
      <ul className="divide-y divide-border">
        {items.map((o) => (
          <li key={o.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <span className="size-1.5 shrink-0 rounded-full bg-accent" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{o.title}</p>
              <p className="truncate text-xs text-fg-subtle">
                {o.ownerName ?? m.brief_team_unknown_owner()} ·{' '}
                {stageLabel(o.stage, lens)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
