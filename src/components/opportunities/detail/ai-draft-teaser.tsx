import { PenLine } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { useUpsell } from '~/lib/billing/use-upsell'
import { LockedFeature } from '~/components/billing/locked-feature'

/**
 * Teaser de l'action « Générer un brouillon de candidature » (Pro+ IA), placé
 * dans le détail d'une opportunité. Verrouillé pour free et pro (l'IA est un
 * palier au-dessus) ; le clic ouvre le dialog de valeur.
 *
 * Invisible pour pro_ai : ils ont déjà l'IA, on ne leur vend rien. (L'action
 * réelle de génération arrivera en Phase 3.)
 */
export function AiDraftTeaser() {
  const { canUse } = useUpsell()

  // Palier IA : pas de teaser (la fonctionnalité réelle viendra en Phase 3).
  if (canUse('ai_draft')) return null

  return (
    <LockedFeature
      feature="ai_draft"
      label={m.opp_ai_draft_teaser_label()}
    >
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3.5 shadow-[var(--shadow-card)]">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
          <PenLine className="size-4" />
        </span>
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-fg">
            {m.opp_ai_draft_teaser_title()}
          </h3>
          <p className="text-sm text-fg-muted">
            {m.opp_ai_draft_teaser_desc()}
          </p>
        </div>
      </div>
    </LockedFeature>
  )
}
