import {
  captureEvent,
  identifyUser,
  setPersonProps,
  resetAnalytics,
  initPostHog,
} from './posthog'
import { EVENTS, type EventName } from './events'

/**
 * Façade analytique typée — UNIQUE point d'import de l'analytics dans l'app (DIP :
 * rien d'autre n'importe posthog-js). `track()` n'accepte que des `EventName`
 * connus, ce qui bloque les fautes de frappe à la compilation.
 */
export { EVENTS, initPostHog, identifyUser, setPersonProps, resetAnalytics }
export type { EventName }

export function track(
  event: EventName,
  properties?: Record<string, unknown>,
): void {
  captureEvent(event, properties)
}
