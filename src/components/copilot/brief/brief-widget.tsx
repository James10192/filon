import { useQuery } from 'convex/react'
import { Sparkles, Wand2 } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { CopilotUpsell } from '../copilot-upsell'
import { BriefFollowups } from './brief-followups'
import { BriefPriorities, BriefTeam } from './brief-priorities'
import { BriefRankSection } from './brief-rank'
import { BriefSignals } from './brief-signals'
import { buildNarrationPrompt } from './narration'

/**
 * Brief du jour (flagship copilot_max). Données déterministes calculées côté
 * serveur (`api.copilot.brief`) : s'affiche INSTANTANÉMENT à l'ouverture, zéro
 * coût LLM. Le bouton « Priorise ma journée » ne fait que SEEDER un prompt de
 * narration (l'utilisateur valide l'envoi : pas de consommation surprise).
 *
 * États gérés : loading (skeleton), gated (upsell copilot_max), empty (chaque
 * section gère son vide). `onNarrate` est fourni par le panneau hôte.
 */
export function BriefWidget({
  onNarrate,
  onNavigate,
}: {
  onNarrate: (prompt: string) => void
  onNavigate?: () => void
}) {
  const data = useQuery(api.copilot.brief.get, {})

  if (data === undefined) return <BriefSkeleton />
  if (data.gated) {
    return (
      <div className="p-3">
        <CopilotUpsell variant="access" onNavigate={onNavigate} />
      </div>
    )
  }

  const empty =
    data.followups.length === 0 &&
    data.stalled.length === 0 &&
    data.teamPriorities.length === 0 &&
    data.signals.length === 0 &&
    !data.rank

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Sparkles className="size-3.5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-fg">{m.brief_title()}</h2>
            <p className="text-xs text-fg-subtle">{m.brief_subtitle()}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => onNarrate(buildNarrationPrompt(data))}
        >
          <Wand2 className="size-4 text-accent" />
          {m.brief_narrate_cta()}
        </Button>
      </div>

      {empty ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface px-4 py-8 text-center">
          <p className="text-sm text-fg-muted">{m.brief_all_clear()}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <BriefFollowups items={data.followups} />
          <BriefPriorities items={data.stalled} />
          {data.isManager && <BriefTeam items={data.teamPriorities} />}
          {data.rank && <BriefRankSection rank={data.rank} />}
          <BriefSignals items={data.signals} />
        </div>
      )}
    </div>
  )
}

function BriefSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
