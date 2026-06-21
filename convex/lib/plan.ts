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

import { ConvexError } from 'convex/values'

export type Plan = 'free' | 'pro' | 'pro_ai' | 'copilot' | 'copilot_max'

/** Limites par palier. `null` = illimité. */
export type PlanLimits = {
  /** Opportunités actives maximum (stages hors 'won'/'lost'). */
  activeOpportunities: number | null
  /** Recherches de veille enregistrées maximum. */
  savedSearches: number | null
  /** Le moniteur educarriere (cron) surveille les recherches de ce palier. */
  veilleAutoMonitor: boolean
  /**
   * Membres maximum dans une organisation possédée par ce palier (créateur
   * inclus). `null` = illimité. L'org est ouverte à tous (free inclus) ; la
   * limite de membres est le levier doux côté gratuit.
   */
  orgMembers: number | null
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    activeOpportunities: 25,
    savedSearches: 1,
    veilleAutoMonitor: false,
    orgMembers: 3,
  },
  pro: {
    activeOpportunities: null,
    savedSearches: null,
    veilleAutoMonitor: true,
    orgMembers: null,
  },
  pro_ai: {
    activeOpportunities: null,
    savedSearches: null,
    veilleAutoMonitor: true,
    orgMembers: null,
  },
  copilot: {
    activeOpportunities: null,
    savedSearches: null,
    veilleAutoMonitor: true,
    orgMembers: null,
  },
  copilot_max: {
    activeOpportunities: null,
    savedSearches: null,
    veilleAutoMonitor: true,
    orgMembers: null,
  },
}

/** Plafond de membres d'une org pour un palier (créateur inclus). `null` = illimité. */
export function orgMemberLimit(plan: Plan | undefined | null): number | null {
  return PLAN_LIMITS[planOf(plan)].orgMembers
}

/** Normalise un `plan` éventuellement absent en palier effectif. */
export function planOf(plan: Plan | undefined | null): Plan {
  return plan ?? 'free'
}

export function limitsFor(plan: Plan | undefined | null): PlanLimits {
  return PLAN_LIMITS[planOf(plan)]
}

/**
 * Type de charge utile transportée par nos erreurs métier. CRITIQUE : on lance
 * une `ConvexError` (pas une `Error` brute), car en PRODUCTION Convex masque le
 * message des erreurs non-`ConvexError` (« Server Error ») — le client ne verrait
 * jamais notre message d'upsell. La `data` typée, elle, traverse jusqu'au client.
 */
export type AppErrorData =
  | { kind: 'PLAN_LIMIT'; message: string }
  | { kind: 'AI_CREDIT'; message: string }
  | { kind: 'FORBIDDEN'; message: string }
  | { kind: 'AUTH'; message: string }
  | { kind: 'NOT_FOUND'; message: string }
  | { kind: 'VALIDATION'; message: string }
  | { kind: 'BILLING'; message: string }

/** Préfixe historique (compat dev/logs) ; le mécanisme réel est `data.kind`. */
export const PLAN_LIMIT_PREFIX = 'PLAN_LIMIT:'

export function planLimitError(message: string): ConvexError<AppErrorData> {
  // Ex message : « Vous avez atteint la limite de 25 opportunités du palier
  // Découverte. Passez à Pro pour un pipeline illimité. »
  return new ConvexError({ kind: 'PLAN_LIMIT', message })
}

/**
 * Erreur d'accès refusé (back-office /admin). `ConvexError` (pas `Error` brute) :
 * en PROD Convex masque le message des erreurs non-`ConvexError`, le client ne
 * verrait jamais notre message. La `data.kind = 'FORBIDDEN'` traverse jusqu'au
 * client (cf. `appErrorData` côté `src/lib/billing/plan.ts`).
 */
export function forbiddenError(
  message = 'Accès réservé aux administrateurs.',
): ConvexError<AppErrorData> {
  return new ConvexError({ kind: 'FORBIDDEN', message })
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
 * consommation interne (≈ un acte du copilote, dérivé du coût tokens).
 *
 * Stratégie « dégustation » (arbitrage grill-me 2026-06-15) : TOUS les paliers
 * reçoivent un quota, même gratuit, pour faire RESSENTIR la magie de l'agent sur
 * un marché qui ne connaît pas encore l'IA. Avec le markup (×8), un crédit offert
 * coûte ~1 XOF : l'acquisition par dégustation est quasi gratuite et nourrit le
 * bouche-à-oreille. `free`/`pro` = un avant-goût ; `pro_ai` = à l'acte ; `copilot`
 * = généreux (fair-use). Les packs achetés à la carte s'ajoutent (packBalance).
 */
export const AI_MONTHLY_CREDITS: Record<Plan, number> = {
  free: 25,
  pro: 100,
  pro_ai: 300,
  copilot: 6000,
  copilot_max: 20000,
}

/**
 * Le palier donne-t-il accès au copilote IA (agent + outils) ? Désormais piloté
 * par les CRÉDITS, pas par le palier : tout palier doté d'une allocation > 0
 * peut goûter l'agent (dégustation). Le mur n'est plus l'accès mais le solde.
 */
export function aiAccess(plan: Plan | undefined | null): boolean {
  return AI_MONTHLY_CREDITS[planOf(plan)] > 0
}

/**
 * Paliers en « usage loyal » (fair-use) : on ne bloque pas net à zéro crédit (la
 * marge ×8 nous couvre), on continue jusqu'au plafond anti-abus. Les paliers en
 * dégustation (free/pro/pro_ai) butent sur un mur dur = déclencheur d'upgrade.
 */
export const FAIR_USE_PLANS: ReadonlySet<Plan> = new Set<Plan>([
  'copilot',
  'copilot_max',
])

/** Plafond anti-abus en fair-use : multiple de l'allocation mensuelle. */
export const FAIR_USE_CEILING = 3

// --- Modes de permission du copilote (autonomie des écritures) ---

/** Mode d'autonomie des outils d'écriture du copilote. */
export type PermMode = 'ask' | 'accept' | 'auto' | 'bypass'

/**
 * Modes AUTONOMES (exécution sans confirmation préalable) réservés au palier
 * Copilot Max. `auto`/`bypass` laissent l'agent agir seul ; ils ne doivent
 * jamais être accordés à un palier inférieur.
 */
const AUTONOMOUS_MODES: ReadonlySet<PermMode> = new Set<PermMode>([
  'auto',
  'bypass',
])

/** Repli sûr quand un mode autonome n'est pas (ou plus) autorisé : « ask ». */
export const SAFE_PERM_MODE: PermMode = 'ask'

/** Le palier autorise-t-il les modes autonomes Auto / Bypass ? */
export function allowsAutonomousMode(plan: Plan | undefined | null): boolean {
  return planOf(plan) === 'copilot_max'
}

/** Le palier peut-il sélectionner ce mode de permission ? */
export function permModeAllowed(
  plan: Plan | undefined | null,
  mode: PermMode,
): boolean {
  if (AUTONOMOUS_MODES.has(mode)) return allowsAutonomousMode(plan)
  return true // ask / accept : tous les paliers
}

/**
 * Mode effectif réellement applicable au palier : un mode autonome stocké par un
 * user qui n'y a plus droit (rétrogradation) est ramené au repli sûr (`ask`).
 * C'est LE garde-fou consommé côté exécution (write tools) et reflété à l'UI.
 */
export function effectivePermMode(
  plan: Plan | undefined | null,
  mode: PermMode,
): PermMode {
  return permModeAllowed(plan, mode) ? mode : SAFE_PERM_MODE
}

/**
 * Le palier peut-il router vers le modèle « Qualité » (meilleur modèle) ?
 * Réservé aux paliers Copilot (dégustation IA généreuse). Les paliers inférieurs
 * sont clampés sur « Rapide » côté serveur.
 */
export function allowsQualityModel(plan: Plan | undefined | null): boolean {
  const p = planOf(plan)
  return p === 'copilot' || p === 'copilot_max'
}

/** Le palier bénéficie-t-il du routage prioritaire (débit OpenRouter) ? */
export function allowsPriorityRouting(plan: Plan | undefined | null): boolean {
  return planOf(plan) === 'copilot_max'
}

/**
 * Le palier peut-il utiliser BYOK (« apportez votre propre clé » OpenRouter) ?
 * Réservé aux paliers Copilot : l'utilisateur branche sa propre clé, ses appels
 * passent par SON compte (il paie son fournisseur) et NE consomment PAS nos
 * crédits. Garde-fou serveur consommé par `byok.resolve` / `sendMessage` pour
 * décider de contourner le solde et de ne rien débiter — jamais côté client.
 */
export function allowsByok(plan: Plan | undefined | null): boolean {
  const p = planOf(plan)
  return p === 'copilot' || p === 'copilot_max'
}

/** Préfixe historique (compat dev/logs) ; le mécanisme réel est `data.kind`. */
export const AI_CREDIT_PREFIX = 'AI_CREDIT:'

export function aiCreditError(
  message = 'Crédits IA épuisés. Rechargez un pack ou attendez le renouvellement mensuel.',
): ConvexError<AppErrorData> {
  return new ConvexError({ kind: 'AI_CREDIT', message })
}

/**
 * Erreur d'authentification. `ConvexError` (pas `Error` brute) : en PROD Convex
 * masque le message des erreurs non-`ConvexError`, le client ne verrait jamais
 * notre message. La `data.kind = 'AUTH'` traverse jusqu'au client.
 */
export function authError(
  message = 'Non authentifié',
): ConvexError<AppErrorData> {
  return new ConvexError({ kind: 'AUTH', message })
}

/**
 * Erreur « ressource introuvable ». `ConvexError` typée pour que le client
 * affiche un message utile en production (sinon « Server Error »).
 */
export function notFoundError(
  message = 'Introuvable.',
): ConvexError<AppErrorData> {
  return new ConvexError({ kind: 'NOT_FOUND', message })
}

/**
 * Erreur de validation (champ requis, valeur invalide). `ConvexError` typée
 * pour que le client affiche le motif précis en production.
 */
export function validationError(message: string): ConvexError<AppErrorData> {
  return new ConvexError({ kind: 'VALIDATION', message })
}
