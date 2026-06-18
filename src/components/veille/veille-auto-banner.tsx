import { Radar } from 'lucide-react'
import { useUpsell } from '~/lib/billing/use-upsell'
import { LockedFeature } from '~/components/billing/locked-feature'
import { m } from '~/lib/paraglide/messages'

/**
 * Hook d'upsell de la veille AUTO (cron toutes les 6h), réservée aux paliers
 * payants. Présentée comme une fonctionnalité verrouillée et désirable pour les
 * comptes Découverte, qui gardent la veille MANUELLE via « Lancer maintenant ».
 *
 * Pour les paliers payants (veille auto déjà active), ne rend rien.
 */
export function VeilleAutoBanner() {
  const { canUse } = useUpsell()

  // Palier payant : la veille auto tourne déjà, pas de banner.
  if (canUse('veille_auto')) return null

  return (
    <LockedFeature feature="veille_auto" label={m.veille_auto_locked_label()}>
      <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
            <Radar className="size-5" />
          </span>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-fg">
              {m.veille_auto_title()}
            </h3>
            <p className="max-w-md text-sm leading-relaxed text-fg-muted">
              {m.veille_auto_body()}
            </p>
          </div>
        </div>
        {/* Toggle décoratif OFF (la veille auto n'est PAS active sur ce palier ;
            l'afficher ON serait trompeur). Ghosté par LockedFeature. */}
        <span
          aria-hidden
          className="flex h-6 w-11 shrink-0 items-center rounded-full bg-border px-0.5"
        >
          <span className="size-5 translate-x-0 rounded-full bg-white shadow-sm" />
        </span>
      </div>
    </LockedFeature>
  )
}
