import { useEffect } from 'react'
import { initPostHog } from '~/lib/analytics'

/**
 * Démarre PostHog après l'hydratation. Ne rend rien. Monté dans `__root` pour
 * couvrir la landing publique ET l'app. SSR-safe : `initPostHog` est gardé
 * navigateur et charge posthog-js en import dynamique.
 */
export function AnalyticsBootstrap() {
  useEffect(() => {
    initPostHog()
  }, [])
  return null
}
