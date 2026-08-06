import { RateLimiter } from '@convex-dev/rate-limiter'
import { components } from '../_generated/api'
import { validationError } from './plan'
import type { ActionCtx, MutationCtx } from './withUser'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/**
 * Limiteur de débit partagé (component `@convex-dev/rate-limiter`).
 *
 * Les limites sont VOLONTAIREMENT généreuses : elles ne gênent aucun usage
 * légitime, elles coupent seulement le spam automatisé sur les surfaces qui
 * coûtent de l'argent (Paystack), déclenchent un fetch sortant (veille) ou
 * écrivent en masse (import de contacts). Toutes sont scopées par utilisateur.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Aperçu d'une source de veille (fetch sortant). ~30/min, rafale de 10.
  veilleParse: { kind: 'token bucket', rate: 30, period: MINUTE, capacity: 10 },
  // Lancement d'un paiement Paystack. 20/h : très au-delà d'un usage humain.
  startCheckout: { kind: 'fixed window', rate: 20, period: HOUR },
  // Envoi d'un retour utilisateur. 20/h.
  feedbackSubmit: { kind: 'fixed window', rate: 20, period: HOUR },
  // Import en masse de contacts. 10/h.
  contactsImport: { kind: 'fixed window', rate: 10, period: HOUR },
})

/** Noms de limites définies ci-dessus (autocomplétion + typo-safe). */
export type RateLimitName =
  | 'veilleParse'
  | 'startCheckout'
  | 'feedbackSubmit'
  | 'contactsImport'

/**
 * Consomme un jeton de la limite `name` pour l'utilisateur `userId`. Throw une
 * `ConvexError` VALIDATION (message avec délai) si la limite est atteinte —
 * jamais d'échec silencieux, le client affiche le motif.
 */
export async function enforceRateLimit(
  ctx: MutationCtx | ActionCtx,
  name: RateLimitName,
  userId: string,
): Promise<void> {
  const { ok, retryAfter } = await rateLimiter.limit(ctx, name, { key: userId })
  if (!ok) {
    const seconds = Math.ceil((retryAfter ?? 0) / 1000)
    throw validationError(
      `Trop de requêtes. Réessayez dans ${seconds} seconde${seconds > 1 ? 's' : ''}.`,
    )
  }
}
