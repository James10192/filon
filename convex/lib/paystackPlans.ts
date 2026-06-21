/**
 * Souscriptions Paystack natives · helpers PURS (aucun import Convex runtime).
 *
 * Un Plan Paystack porte UN couple (montant + intervalle). Il faut donc 8 Plans
 * pour Filon : 4 paliers (pro / pro_ai / copilot / copilot_max) × 2 intervalles
 * (mensuel / annuel). Ce module ne fait QUE du calcul de clés/intervalles/noms ; la
 * résolution runtime des `plan_code` (lecture de la table `billingPlans`) et la
 * création des Plans côté PSP vivent dans `convex/paystackPlans.ts`.
 */

import type { Interval, PaidPlan } from './pricing'

/** Tous les couples (palier × intervalle) à provisionner. 4 × 2 = 8. */
export const PLAN_COMBOS: ReadonlyArray<{ plan: PaidPlan; interval: Interval }> = [
  { plan: 'pro', interval: 'monthly' },
  { plan: 'pro', interval: 'annual' },
  { plan: 'pro_ai', interval: 'monthly' },
  { plan: 'pro_ai', interval: 'annual' },
  { plan: 'copilot', interval: 'monthly' },
  { plan: 'copilot', interval: 'annual' },
  { plan: 'copilot_max', interval: 'monthly' },
  { plan: 'copilot_max', interval: 'annual' },
]

/** Clé logique stable d'un couple, partagée DB (`planKey`) et runtime. */
export function planKeyOf(plan: PaidPlan, interval: Interval): string {
  return `${plan}_${interval}`
}

/**
 * Nom convenu du Plan côté Paystack (ex 'filon_pro_monthly'). Sert de critère de
 * recherche idempotente (GET /plan) AVANT toute création, pour ne JAMAIS créer
 * deux fois le même Plan.
 */
export function paystackPlanName(plan: PaidPlan, interval: Interval): string {
  return `filon_${planKeyOf(plan, interval)}`
}

/**
 * Intervalle au format Paystack. CRITIQUE : Filon dit 'annual', Paystack attend
 * 'annually' (et 'monthly' inchangé). Une erreur ici crée un Plan au mauvais
 * rythme de facturation.
 */
export function paystackInterval(interval: Interval): 'monthly' | 'annually' {
  return interval === 'annual' ? 'annually' : 'monthly'
}

/** Map d'entrée `planKey -> plan_code`, pour une résolution O(1) côté runtime. */
export type PlanCodeMap = Record<string, string>

/**
 * Résout le `plan_code` Paystack d'un couple, ou `null` si les Plans ne sont pas
 * encore provisionnés (table `billingPlans` vide). `null` = on retombe sur le
 * paiement ponctuel actuel → zéro régression en test-mode tant qu'`ensurePlans`
 * n'a pas tourné.
 */
export function planCodeFor(
  map: PlanCodeMap,
  plan: PaidPlan,
  interval: Interval,
): string | null {
  return map[planKeyOf(plan, interval)] ?? null
}
