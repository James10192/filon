/**
 * Grille tarifaire Filon (XOF) — source unique, pure (aucun import Convex).
 *
 * Importée à la fois par l'action Paystack (montant à débiter) et par le
 * miroir client `src/lib/billing/plan.ts` (affichage page Tarifs). Les montants
 * sont en XOF entiers (devise zéro décimale). La conversion en sous-unité
 * Paystack (× 100) est faite UNE SEULE FOIS dans l'action, au moment d'appeler
 * l'API — voir le commentaire dans `convex/paystack.ts`.
 */

export type PaidPlan = 'pro' | 'pro_ai' | 'copilot' | 'copilot_max'
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
  // Copilot Max : puissance maximale du copilote, quota XXL, au-dessus de Copilot.
  copilot_max: { monthly: 35000, annual: 350000 },
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
  copilot_max: 'Copilot Max',
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

// --- Copilot IA : coût modèle + marge (arbitrage grill-me 2026-06-15) ---

/** Modes d'exécution du copilote (latence vs qualité). */
export type AiMode = 'fast' | 'quality'

/**
 * Tarifs modèle (USD / million de tokens), par mode. Conservateurs (arrondis
 * au-dessus) pour protéger la marge. À mettre à jour si OpenRouter change ses
 * prix ou si on change de modèle dans `convex/agent/models.ts`.
 */
export const MODEL_PRICING: Record<AiMode, { inUsd: number; outUsd: number }> = {
  fast: { inUsd: 0.25, outUsd: 2 }, // gpt-5.4-mini (classe mini)
  quality: { inUsd: 3, outUsd: 15 }, // claude-sonnet-4.6
}

/** FX facturé au-dessus du spot (~605) pour absorber la volatilité du franc. */
export const FX_XOF_PER_USD = 680
/** Marge minimale garantie sur le coût réel de chaque appel. */
export const AI_MARKUP = 8
/** Prix de détail d'un crédit (mi-pack), pour convertir le plancher en crédits. */
export const CREDIT_XOF = 8
