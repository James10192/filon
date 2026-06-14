import { Radar } from 'lucide-react'
import { useUpsell } from '~/lib/billing/use-upsell'
import { LockedFeature } from '~/components/billing/locked-feature'

/**
 * Le hook le plus fort de la veille : présente la veille automatique comme une
 * fonctionnalité verrouillée et désirable pour les comptes gratuits. Le toggle
 * « Activez la veille automatique » est ghosté sous un badge Pro ; le clic
 * ouvre le dialog de valeur.
 *
 * Pour les paliers payants (veille déjà active), ne rend rien : leur moniteur
 * tourne, inutile de leur vendre ce qu'ils ont.
 */
export function VeilleAutoBanner() {
  const { canUse } = useUpsell()

  // Palier payant : la veille auto tourne déjà, pas de banner.
  if (canUse('veille_auto')) return null

  return (
    <LockedFeature feature="veille_auto" label="Activez la veille automatique">
      <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
            <Radar className="size-5" />
          </span>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-fg">
              Veille automatique educarriere
            </h3>
            <p className="max-w-md text-sm leading-relaxed text-fg-muted">
              Filon surveille educarriere toutes les 6 heures et ajoute les
              offres qui correspondent à vos mots-clés, pendant que vous dormez.
            </p>
          </div>
        </div>
        {/* Toggle décoratif (ghosté par LockedFeature). */}
        <span
          aria-hidden
          className="flex h-6 w-11 shrink-0 items-center rounded-full bg-accent px-0.5"
        >
          <span className="size-5 translate-x-5 rounded-full bg-white shadow-sm" />
        </span>
      </div>
    </LockedFeature>
  )
}
