import { Gauge } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { useUpsell } from '~/lib/billing/use-upsell'
import { LockedFeature } from '~/components/billing/locked-feature'

/**
 * Teaser discret du « score de pertinence IA » sur l'espace Opportunités.
 * Verrouillé pour free et pro (l'IA est un palier au-dessus) ; le clic ouvre le
 * dialog de valeur. Invisible pour pro_ai (déjà débloqué).
 *
 * Présenté comme une colonne / un indicateur à venir, ghosté élégamment, pour
 * suggérer la valeur sans encombrer le tableau réel.
 */
export function AiScoreTeaser() {
  const { canUse } = useUpsell()

  if (canUse('ai_score')) return null

  return (
    <LockedFeature
      feature="ai_score"
      label={m.opp_ai_score_label()}
      className="mb-4"
    >
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
          <Gauge className="size-4" />
        </span>
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-fg">
            {m.opp_ai_score_title()}
          </h3>
          <p className="text-sm text-fg-muted">
            {m.opp_ai_score_desc()}
          </p>
        </div>
      </div>
    </LockedFeature>
  )
}
