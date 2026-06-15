import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

/**
 * Tâches planifiées Filon.
 *
 * - Moniteur educarriere : toutes les 6h (board à faible vélocité ; la
 *   déduplication via l'index `by_user_sourceUrl` rend les ré-exécutions
 *   idempotentes, donc aucune offre dupliquée).
 * - Cycle de vie d'abonnement (quotidien) : relance d'échéance puis application
 *   des expirations. La relance tourne AVANT l'expiration pour que les users
 *   dont la période vient d'échoir aient bien été prévenus la veille.
 */
const crons = cronJobs()

crons.interval(
  'veille-educarriere-monitor',
  { hours: 6 },
  internal.veille.actions.runMonitor,
  {},
)

// Renouvellement (Axe 2) : auto-débit carte ~48h avant échéance (minorité avec
// carte réutilisable) + relances in-app J-7/J-3/J-1 (mobile money et reste).
// Remplace l'ancien `flagRenewalReminders` (relance seule) par le flux complet.
crons.daily(
  'billing-renewals',
  { hourUTC: 6, minuteUTC: 0 },
  internal.billingRenewal.runRenewals,
  {},
)

// Application des expirations : downgrade programmé / annulation / fin de
// période (après la période de grâce). Décalé après le renouvellement.
crons.daily(
  'billing-process-expirations',
  { hourUTC: 6, minuteUTC: 30 },
  internal.billingLifecycle.processExpirations,
  {},
)

// Réinitialisation mensuelle de l'allocation de crédits IA (le 1er du mois).
// Remet `balance` à l'allocation du palier courant ; ne touche pas aux packs.
crons.monthly(
  'ai-credits-reset',
  { day: 1, hourUTC: 5, minuteUTC: 0 },
  internal.aiCredits.resetMonthlyAllowances,
  {},
)

export default crons
