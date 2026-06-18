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

export {
  PLAN_LIMITS,
  PLAN_LIMIT_PREFIX,
  type Plan,
  type AppErrorData,
} from '../../../convex/lib/plan'

import type { AppErrorData } from '../../../convex/lib/plan'

/** Formate un montant XOF entier : « 3 500 XOF » (espace fine insécable). */
export function formatXof(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/ /g, ' ')} XOF`
}

/**
 * Extrait notre charge utile métier d'une `ConvexError`. CRITIQUE : en prod
 * Convex masque `error.message` (« Server Error ») mais transmet `error.data`.
 * On lit donc la `data` typée. Fallback legacy : parse du préfixe dans le
 * message (utile en dev où le message brut passe encore).
 */
function appErrorData(error: unknown): AppErrorData | null {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data
    if (
      data &&
      typeof data === 'object' &&
      'kind' in data &&
      'message' in data &&
      typeof (data as { message?: unknown }).message === 'string'
    ) {
      // Générique : tout `kind` typé (PLAN_LIMIT, AI_CREDIT, FORBIDDEN, AUTH,
      // NOT_FOUND, VALIDATION, ...) est remonté tel quel jusqu'à l'UI.
      return data as AppErrorData
    }
  }
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  for (const kind of ['PLAN_LIMIT', 'AI_CREDIT'] as const) {
    const idx = raw.indexOf(`${kind}:`)
    if (idx !== -1) {
      return { kind, message: raw.slice(idx + kind.length + 1).trim() }
    }
  }
  return null
}

/**
 * Message lisible d'une `ConvexError` métier, quel que soit son `kind`. En prod
 * Convex masque `error.message` mais transmet `error.data` : on lit donc la
 * `data.message` typée. Si l'erreur n'est pas une `ConvexError` connue, renvoie
 * le `fallback` fourni. Idéal pour afficher un toast d'échec générique.
 */
export function errorMessage(error: unknown, fallback: string): string {
  const data = appErrorData(error)
  return data?.message ?? fallback
}

/** Si `error` est une limite freemium, renvoie le message lisible ; sinon `null`. */
export function planLimitMessage(error: unknown): string | null {
  const data = appErrorData(error)
  return data?.kind === 'PLAN_LIMIT' ? data.message : null
}

/** Si `error` est un épuisement de crédits IA, renvoie le message ; sinon `null`. */
export function aiCreditMessage(error: unknown): string | null {
  const data = appErrorData(error)
  return data?.kind === 'AI_CREDIT' ? data.message : null
}

/** Si `error` est un accès refusé (back-office), renvoie le message ; sinon `null`. */
export function forbiddenMessage(error: unknown): string | null {
  const data = appErrorData(error)
  return data?.kind === 'FORBIDDEN' ? data.message : null
}
