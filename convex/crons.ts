import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

/**
 * Tâches planifiées Filon.
 *
 * Moniteur educarriere : toutes les 6h (board à faible vélocité ; la
 * déduplication via l'index `by_user_sourceUrl` rend les ré-exécutions
 * idempotentes, donc aucune offre dupliquée).
 */
const crons = cronJobs()

crons.interval(
  'veille-educarriere-monitor',
  { hours: 6 },
  internal.veille.actions.runMonitor,
  {},
)

export default crons
