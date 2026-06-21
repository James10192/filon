import { Trophy } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Card, Header } from '../widgets/primitives'
import type { BriefRank } from './types'

/**
 * Section « Progression de palier » du brief. Lecture seule : barre de
 * progression vers la cible d'actifs (réseau acquis). N'affiche rien si
 * l'utilisateur n'a pas défini d'objectif (rank null côté serveur).
 */
export function BriefRankSection({ rank }: { rank: BriefRank }) {
  if (!rank) return null
  const { target, activeCount, remaining, goalLabel } = rank
  const pct = target > 0 ? Math.min(100, (activeCount / target) * 100) : 0
  const reached = remaining === 0

  return (
    <Card>
      <Header icon={Trophy} label={m.brief_rank_title()} />
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-fg-muted">
            {goalLabel ?? m.brief_rank_default_goal()}
          </span>
          <span className="text-sm font-semibold tabular-nums text-fg">
            {activeCount} / {target}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              reached ? 'bg-success' : 'bg-accent',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p
          className={cn(
            'text-xs font-medium',
            reached ? 'text-success' : 'text-fg-muted',
          )}
        >
          {reached
            ? m.brief_rank_reached()
            : m.brief_rank_remaining({ n: remaining })}
        </p>
      </div>
    </Card>
  )
}
