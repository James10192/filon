import { useQuery } from 'convex/react'
import { Sun, ArrowRight } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { useCopilotLauncher } from '~/components/copilot/copilot-provider'

/**
 * Entrée « Brief du jour » du dashboard (flagship copilot_max). Carte d'appel qui
 * ouvre le copilote directement sur l'onglet Brief. Visible uniquement pour le
 * palier `copilot_max` (gating client miroir du gating serveur de la query).
 */
export function BriefEntry() {
  const credits = useQuery(api.aiCredits.myCredits, {})
  const copilot = useCopilotLauncher()

  if (credits?.plan !== 'copilot_max') return null

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-accent/30 bg-gradient-to-br from-accent/[0.06] to-surface p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent text-white">
          <Sun className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-[-0.015em] text-fg">
            {m.brief_title()}
          </h2>
          <p className="text-sm text-fg-muted">{m.brief_entry_desc()}</p>
        </div>
      </div>
      <Button
        className="shrink-0"
        onClick={() => copilot.openBrief()}
      >
        {m.brief_entry_cta()}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}
