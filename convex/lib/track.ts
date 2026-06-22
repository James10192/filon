import { internal } from '../_generated/api'
import type { MutationCtx, ActionCtx } from './withUser'

/**
 * Noms canoniques des événements émis CÔTÉ SERVEUR (Convex). Source de vérité
 * unique : on ne dissémine jamais de chaînes littérales `capture('…')` dans le
 * code. Convention : `snake_case`, `objet_action`.
 *
 * Miroir client : `src/lib/analytics/events.ts`. Les deux fichiers ne peuvent
 * pas partager de module (frontière src/ ↔ convex/) : garder les noms du funnel
 * synchronisés à la main. Le recouvrement est volontairement minime (le serveur
 * possède la conversion et l'activation, le client possède l'intention).
 */
export const SERVER_EVENTS = {
  signup_completed: 'signup_completed',
  onboarding_completed: 'onboarding_completed',
  activation_first_action: 'opportunity_created',
  subscription_activated: 'subscription_activated',
  renewal_charged: 'renewal_charged',
  renewal_failed: 'renewal_failed',
  subscription_cancelled: 'subscription_cancelled',
  subscription_not_renewing: 'subscription_marked_not_renew',
  referral_claimed: 'referral_claimed',
  referral_reward_granted: 'referral_reward_granted',
} as const

/** Contexte minimal requis : seul `scheduler` est utilisé. */
type SchedulerCtx = Pick<MutationCtx | ActionCtx, 'scheduler'>

/**
 * Programme une capture PostHog serveur sans bloquer la transaction courante.
 * `runAfter(0, …)` met l'action en file : le métier (facturation, signup…) se
 * termine d'abord ; l'event part juste après. Une panne PostHog n'a donc aucun
 * effet sur le chemin critique. `distinctId` = `authId` (Better Auth) pour
 * coller à `posthog.identify(userId)` côté client.
 */
export function trackServer(
  ctx: SchedulerCtx,
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!distinctId) return
  void ctx.scheduler.runAfter(0, internal.analytics.capture, {
    distinctId,
    event,
    ...(properties ? { properties } : {}),
  })
}
