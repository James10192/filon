import type { QueryCtx } from '../_generated/server'
import {
  AI_MONTHLY_CREDITS,
  aiCreditError,
  FAIR_USE_PLANS,
  FAIR_USE_CEILING,
  type Plan,
} from './plan'

/**
 * État de crédits IA d'un user, partagé par les deux gates (copilote agentique
 * et veille « à l'acte »). Centralise le calcul du solde et de la consommation
 * de la période pour qu'aucune dérive de marge ne s'installe entre les deux
 * points d'entrée IA.
 */
export type AiBudget = {
  plan: Plan
  balance: number
  monthUsed: number
  allowance: number
}

/** Lit le solde combiné (allocation + packs) et la conso depuis le début du mois. */
export async function readCreditState(
  ctx: QueryCtx,
  userId: string,
  plan: Plan,
): Promise<AiBudget> {
  const row = await ctx.db
    .query('aiCredits')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  const periodStart = row?.periodStart ?? 0
  const usage = await ctx.db
    .query('aiUsage')
    .withIndex('by_user_created', (q) =>
      q.eq('userId', userId).gte('createdAt', periodStart),
    )
    .collect()
  const monthUsed = usage.reduce((sum, u) => sum + u.creditsDebited, 0)
  return {
    plan,
    balance: (row?.balance ?? 0) + (row?.packBalance ?? 0),
    monthUsed,
    allowance: AI_MONTHLY_CREDITS[plan],
  }
}

/**
 * État de service d'un budget IA, sans effet de bord :
 * - `ok` : solde positif, on sert normalement.
 * - `fair_use` : solde à zéro mais palier fair-use sous le plafond anti-abus, on
 *   continue à servir (throttle doux) en invitant à recharger (nudge non bloquant).
 * - `blocked` : mur dur (palier en dégustation à zéro, ou fair-use au plafond).
 */
export type AiBudgetStatus = 'ok' | 'fair_use' | 'blocked'

/**
 * Classe un budget IA SANS throw : source unique de décision « servir / nudger /
 * bloquer », réutilisée par le gate (serveur) et par `myCredits` (UI). Garde la
 * même logique que `ensureAiBudget`, exposée de façon pure pour piloter le nudge.
 */
export function aiBudgetStatus(gate: AiBudget): AiBudgetStatus {
  if (gate.balance > 0) return 'ok'
  if (!FAIR_USE_PLANS.has(gate.plan)) return 'blocked'
  return gate.monthUsed >= gate.allowance * FAIR_USE_CEILING
    ? 'blocked'
    : 'fair_use'
}

/**
 * Stratégie fair-use partagée : on ne bloque pas net à zéro pour les paliers
 * fair-use (copilot, couverts par la marge ×8) jusqu'au plafond anti-abus ; mur
 * dur pour les paliers en dégustation (déclencheur d'upgrade). Throw `aiCreditError`.
 * Délègue la décision à `aiBudgetStatus` pour rester l'unique source de vérité.
 */
export function ensureAiBudget(gate: AiBudget): void {
  const status = aiBudgetStatus(gate)
  if (status !== 'blocked') return
  if (gate.balance <= 0 && FAIR_USE_PLANS.has(gate.plan)) {
    throw aiCreditError(
      'Usage exceptionnel atteint ce mois. Rechargez un pack pour continuer.',
    )
  }
  throw aiCreditError()
}
