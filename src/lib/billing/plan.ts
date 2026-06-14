/**
 * Miroir client du domaine billing.
 *
 * Réexporte la grille tarifaire et les libellés depuis `convex/lib/pricing.ts`
 * (source unique, module pur) et la table des limites depuis `convex/lib/plan`.
 * Aucune logique de décision ici : le serveur reste l'autorité. Ce module sert
 * l'affichage (page Tarifs, badge de palier) et la détection des erreurs de
 * limite pour l'UI d'upsell.
 */

export {
  PRICING,
  PLAN_LABELS,
  priceXof,
  type PaidPlan,
  type Interval,
} from '../../../convex/lib/pricing'

export { PLAN_LIMITS, PLAN_LIMIT_PREFIX, type Plan } from '../../../convex/lib/plan'

/** Formate un montant XOF entier : « 3 500 XOF » (espace fine insécable). */
export function formatXof(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/ /g, ' ')} XOF`
}

/**
 * Si `error` est une erreur de limite freemium (préfixe `PLAN_LIMIT:`), renvoie
 * le message lisible (sans le préfixe) ; sinon `null`. Le message Convex arrive
 * souvent enveloppé (« Uncaught Error: PLAN_LIMIT:… »), d'où le `indexOf`.
 */
export function planLimitMessage(error: unknown): string | null {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  const idx = raw.indexOf('PLAN_LIMIT:')
  if (idx === -1) return null
  return raw.slice(idx + 'PLAN_LIMIT:'.length).trim()
}
