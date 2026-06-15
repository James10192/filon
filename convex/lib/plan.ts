/**
 * Source unique des paliers d'abonnement et du gating freemium (côté serveur).
 *
 * Un miroir client minimal existe dans `src/lib/billing/plan.ts` (libellés +
 * grille tarifaire pour la page Tarifs). La logique de limite, elle, vit ICI :
 * c'est le serveur qui décide, jamais le client.
 *
 * Règles d'or :
 * - L'absence de `plan` sur une ligne `users` = palier 'free'.
 * - Les limites s'appliquent à la CRÉATION (throw une erreur typée). On ne
 *   supprime ni ne masque jamais de donnée existante : un user qui rétrograde
 *   garde ses opportunités, il ne peut simplement plus en créer au-delà du cap.
 */

export type Plan = 'free' | 'pro' | 'pro_ai' | 'copilot'

/** Limites par palier. `null` = illimité. */
export type PlanLimits = {
  /** Opportunités actives maximum (stages hors 'won'/'lost'). */
  activeOpportunities: number | null
  /** Recherches de veille enregistrées maximum. */
  savedSearches: number | null
  /** Le moniteur educarriere (cron) surveille les recherches de ce palier. */
  veilleAutoMonitor: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    activeOpportunities: 25,
    savedSearches: 1,
    veilleAutoMonitor: false,
  },
  pro: {
    activeOpportunities: null,
    savedSearches: null,
    veilleAutoMonitor: true,
  },
  pro_ai: {
    activeOpportunities: null,
    savedSearches: null,
    veilleAutoMonitor: true,
  },
  copilot: {
    activeOpportunities: null,
    savedSearches: null,
    veilleAutoMonitor: true,
  },
}

/** Normalise un `plan` éventuellement absent en palier effectif. */
export function planOf(plan: Plan | undefined | null): Plan {
  return plan ?? 'free'
}

export function limitsFor(plan: Plan | undefined | null): PlanLimits {
  return PLAN_LIMITS[planOf(plan)]
}

/**
 * Erreur de limite atteinte. Sérialisée avec un préfixe stable que le client
 * détecte pour afficher l'UI d'upsell (toast + lien vers /app/tarifs).
 */
export const PLAN_LIMIT_PREFIX = 'PLAN_LIMIT:'

export function planLimitError(message: string): Error {
  // Ex: "PLAN_LIMIT:Vous avez atteint la limite de 25 opportunités du palier
  // Découverte. Passez à Pro pour un pipeline illimité."
  return new Error(`${PLAN_LIMIT_PREFIX}${message}`)
}

/** Stages considérés « actifs » (comptés dans le cap freemium). */
export const ACTIVE_STAGES = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
] as const

// --- Copilot IA (Phase IA) ---

/**
 * Allocation mensuelle de crédits IA par palier. Un « crédit » est l'unité de
 * consommation interne (≈ un acte du copilote, dérivé du coût tokens). Seuls les
 * paliers IA en ont : `free`/`pro` = 0, `pro_ai` = quota modeste, `copilot` =
 * généreux. Les packs achetés à la carte s'ajoutent par-dessus (packBalance).
 */
export const AI_MONTHLY_CREDITS: Record<Plan, number> = {
  free: 0,
  pro: 0,
  pro_ai: 150,
  copilot: 2000,
}

/** Le palier donne-t-il accès au copilote IA (agent + outils) ? */
export function aiAccess(plan: Plan | undefined | null): boolean {
  return planOf(plan) === 'copilot'
}

/**
 * Erreur de crédits IA épuisés. Préfixe stable détecté côté client pour afficher
 * l'UI d'achat de pack (toast + lien vers /app/tarifs).
 */
export const AI_CREDIT_PREFIX = 'AI_CREDIT:'

export function aiCreditError(
  message = 'Crédits IA épuisés. Rechargez un pack ou attendez le renouvellement mensuel.',
): Error {
  return new Error(`${AI_CREDIT_PREFIX}${message}`)
}
