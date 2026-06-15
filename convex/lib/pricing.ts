/**
 * Grille tarifaire Filon (XOF) — source unique, pure (aucun import Convex).
 *
 * Importée à la fois par l'action Paystack (montant à débiter) et par le
 * miroir client `src/lib/billing/plan.ts` (affichage page Tarifs). Les montants
 * sont en XOF entiers (devise zéro décimale). La conversion en sous-unité
 * Paystack (× 100) est faite UNE SEULE FOIS dans l'action, au moment d'appeler
 * l'API — voir le commentaire dans `convex/paystack.ts`.
 */

export type PaidPlan = 'pro' | 'pro_ai' | 'copilot'
export type Interval = 'monthly' | 'annual'

export type PriceEntry = {
  /** Prix en XOF entiers (pas en sous-unité). */
  monthly: number
  /** Annuel = 2 mois offerts (10 × mensuel). */
  annual: number
}

/** Prix de référence (ancres ROADMAP). Annuel = 10 × mensuel (2 mois offerts). */
export const PRICING: Record<PaidPlan, PriceEntry> = {
  pro: { monthly: 3500, annual: 35000 },
  pro_ai: { monthly: 9000, annual: 90000 },
  // Copilot : palier IA agentique, au-dessus de Pro+ IA.
  copilot: { monthly: 19000, annual: 190000 },
}

/** Montant XOF (entiers) pour un palier payant et un intervalle donnés. */
export function priceXof(plan: PaidPlan, interval: Interval): number {
  return PRICING[plan][interval]
}

/**
 * Conversion vers la sous-unité attendue par Paystack.
 *
 * IMPORTANT (vérifié dans la doc Paystack) : bien que le XOF n'ait PAS de
 * sous-unité, l'API exige malgré tout de multiplier le montant par 100. Se
 * tromper ici facture 100× trop (ou 100× trop peu). On centralise donc la
 * conversion à un seul endroit.
 */
export function toPaystackSubunit(amountXof: number): number {
  return Math.round(amountXof * 100)
}

/** Libellés FR des paliers (partagés client/serveur). */
export const PLAN_LABELS: Record<'free' | PaidPlan, string> = {
  free: 'Découverte',
  pro: 'Pro',
  pro_ai: 'Pro+ IA',
  copilot: 'Copilot',
}

/**
 * Packs de crédits IA achetables à la carte (one-shot Paystack), pour recharger
 * au-delà de l'allocation mensuelle. `credits` = unités créditées sur le
 * `packBalance` ; `priceXof` = prix en XOF entiers (× 100 côté Paystack).
 */
export type CreditPack = {
  id: string
  credits: number
  priceXof: number
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack_500', credits: 500, priceXof: 5000 },
  { id: 'pack_1500', credits: 1500, priceXof: 12000 },
  { id: 'pack_4000', credits: 4000, priceXof: 28000 },
]

/** Résout un pack par id, ou `undefined` s'il n'existe pas. */
export function creditPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id)
}
