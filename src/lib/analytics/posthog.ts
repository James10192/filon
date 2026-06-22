import type { PostHog, PostHogConfig } from 'posthog-js'

/**
 * Cœur PostHog côté navigateur. posthog-js est chargé en IMPORT DYNAMIQUE (jamais
 * dans le graphe SSR) : l'`import type` ci-dessus est effacé au build, et le
 * `import('posthog-js')` ne s'exécute qu'au navigateur. Zéro risque SSR/hydratation
 * (cf. règles TanStack Start + « more than one copy of React » : posthog-js
 * n'utilise pas React, et n'est jamais évalué côté serveur).
 *
 * Le chargement étant asynchrone, les événements émis AVANT la fin de l'init sont
 * tamponnés (`queue`) puis rejoués — on ne perd pas `landing_viewed` ni les
 * premiers clics. Idem pour un `identify` précoce (`pendingIdentify`).
 */

let ph: PostHog | null = null
let starting = false
const queue: Array<{ event: string; properties?: Record<string, unknown> }> = []
let pendingIdentify: { distinctId: string; properties?: Record<string, unknown> } | null =
  null

function buildConfig(): Partial<PostHogConfig> {
  return {
    // Proxy même-origine (src/routes/api/ph.$.tsx) → résiste aux bloqueurs.
    api_host: '/api/ph',
    ui_host:
      (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
      'https://us.posthog.com',
    // « Tout de A à Z » : capture automatique des clics + pages, ET suivi de la
    // navigation SPA TanStack Router via l'API History.
    autocapture: true,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    // Les visiteurs anonymes ne créent pas de profil (quota) ; seuls les users
    // identifiés en créent un. Le funnel anonyme→identifié reste recousu par
    // posthog.identify().
    person_profiles: 'identified_only',
    persistence: 'localStorage+cookie',
  }
}

/** Démarre PostHog (navigateur uniquement, idempotent). No-op sans clé. */
export function initPostHog(): void {
  if (ph || starting || typeof window === 'undefined') return
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  if (!key) return
  starting = true
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, buildConfig())
    ph = posthog
    if (pendingIdentify) {
      try {
        posthog.identify(pendingIdentify.distinctId, pendingIdentify.properties)
      } catch {
        /* no-op */
      }
      pendingIdentify = null
    }
    for (const item of queue.splice(0)) {
      try {
        posthog.capture(item.event, item.properties)
      } catch {
        /* no-op */
      }
    }
  })
}

/** Capture un événement (tamponné si l'init n'est pas finie). */
export function captureEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  if (ph) {
    try {
      ph.capture(event, properties)
    } catch {
      /* l'analytics ne doit jamais casser l'UI */
    }
    return
  }
  queue.push({ event, properties })
}

/** Rattache la personne à l'utilisateur (tamponné si l'init n'est pas finie). */
export function identifyUser(
  distinctId: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined' || !distinctId) return
  if (!ph) {
    pendingIdentify = { distinctId, properties }
    return
  }
  try {
    ph.identify(distinctId, properties)
  } catch {
    /* no-op */
  }
}

/** Met à jour les propriétés de la personne courante. */
export function setPersonProps(properties: Record<string, unknown>): void {
  if (!ph) return
  try {
    ph.setPersonProperties(properties)
  } catch {
    /* no-op */
  }
}

/** Dissocie la session (à la déconnexion) pour ne pas mélanger les identités. */
export function resetAnalytics(): void {
  if (!ph) return
  try {
    ph.reset()
  } catch {
    /* no-op */
  }
}
