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

// Relance d'échéance : flagge les abonnements arrivant à terme sous 3 j.
crons.daily(
  'billing-renewal-reminders',
  { hourUTC: 6, minuteUTC: 0 },
  internal.billingLifecycle.flagRenewalReminders,
  {},
)

// Application des expirations : downgrade programmé / annulation / fin de
// période. Décalé après la relance.
crons.daily(
  'billing-process-expirations',
  { hourUTC: 6, minuteUTC: 30 },
  internal.billingLifecycle.processExpirations,
  {},
)

export default crons
