/**
 * Noms canoniques des événements émis CÔTÉ CLIENT (posthog-js). Source unique :
 * aucune chaîne littérale `capture('…')` dispersée dans les composants. Le typage
 * `track(event: EventName)` empêche les fautes de frappe qui rendraient un funnel
 * inexploitable.
 *
 * Convention : `snake_case`, `objet_action`. Miroir serveur :
 * `convex/lib/track.ts` (à garder synchronisé pour les étapes de funnel).
 */
export const EVENTS = {
  // Acquisition
  landing_viewed: 'landing_viewed',
  cta_clicked: 'cta_clicked',
  signup_started: 'signup_started',
  signup_submitted: 'signup_submitted',
  signup_failed: 'signup_failed',
  login_submitted: 'login_submitted',
  login_failed: 'login_failed',
  // Revenu (intention — la confirmation est serveur, cf. SERVER_EVENTS)
  pricing_viewed: 'pricing_viewed',
  upgrade_cta_clicked: 'upgrade_cta_clicked',
  payment_channel_selected: 'payment_channel_selected',
  checkout_started: 'checkout_started',
  checkout_failed: 'checkout_failed',
  payment_returned: 'payment_returned',
  // Parrainage / MLM
  referral_link_copied: 'referral_link_copied',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]
