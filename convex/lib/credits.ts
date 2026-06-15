import {
  MODEL_PRICING,
  FX_XOF_PER_USD,
  AI_MARKUP,
  CREDIT_XOF,
  type AiMode,
} from './pricing'

/**
 * Coût en crédits d'un acte IA = MAX(poids de tokens, plancher coût-réel).
 *
 * - Le poids de tokens (1× rapide, 3× qualité) reste prévisible pour l'utilisateur.
 * - Le plancher coût-réel (coût modèle × FX × markup) garantit la marge : on n'est
 *   JAMAIS sous l'eau. Il domine en mode qualité, le poids domine en rapide.
 *
 * Module pur (aucune API Convex) : partagé par le copilote (`aiChat`) et la
 * couche IA « à l'acte » de la veille (`veille/ai`). Voir grill-me 2026-06-15.
 */
export function creditsForUsage(
  inputTokens: number,
  outputTokens: number,
  mode: AiMode,
): number {
  const totalK = (inputTokens + outputTokens) / 1000
  const weight = mode === 'quality' ? 3 : 1
  const tokenCredits = Math.ceil(totalK * weight)

  const price = MODEL_PRICING[mode]
  const costUsd =
    (inputTokens / 1_000_000) * price.inUsd +
    (outputTokens / 1_000_000) * price.outUsd
  const floorCredits = Math.ceil(
    (costUsd * FX_XOF_PER_USD * AI_MARKUP) / CREDIT_XOF,
  )

  return Math.max(1, tokenCredits, floorCredits)
}
