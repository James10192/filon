import { v } from 'convex/values'
import { internalAction } from './_generated/server'

/**
 * Capture serveur PostHog · source de vérité pour les événements qui ne peuvent
 * PAS être de confiance côté client (conversion payante, signup confirmé,
 * activation, parrainage récompensé).
 *
 * Pourquoi un `internalAction` + `fetch` brut (et NON `posthog-node`) :
 * le webhook Paystack et les mutations tournent dans l'isolat V8 de Convex, où
 * le SDK Node ne s'importe pas. L'API HTTP `/i/v0/e/` de PostHog est appelable
 * au `fetch` standard, disponible dans le runtime Convex. On programme cette
 * action via `ctx.scheduler.runAfter(0, …)` depuis les mutations (cf.
 * `convex/lib/track.ts`) pour ne JAMAIS bloquer ni casser le chemin métier :
 * une panne PostHog n'a aucun effet sur la facturation.
 *
 * `distinctId` = identifiant Better Auth (`authId`) : il colle exactement au
 * `posthog.identify(userId)` posé côté client, donc les événements serveur et
 * client se rattachent à la même personne dans le funnel.
 *
 * No-op silencieux si `POSTHOG_PROJECT_KEY` n'est pas configurée (dev local sans
 * clé) : aucune erreur remontée, le métier continue.
 */
export const capture = internalAction({
  args: {
    distinctId: v.string(),
    event: v.string(),
    properties: v.optional(v.any()),
    timestamp: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<null> => {
    const key = process.env.POSTHOG_PROJECT_KEY
    if (!key) return null
    const host = process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com'

    try {
      const res = await fetch(`${host}/i/v0/e/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          event: args.event,
          distinct_id: args.distinctId,
          properties: {
            ...(args.properties ?? {}),
            // Marque l'origine serveur pour distinguer des events client dans
            // PostHog, et désactive le géo-enrichissement sur ces events serveur.
            $lib: 'filon-convex',
            $process_person_profile: true,
          },
          timestamp: new Date(args.timestamp ?? Date.now()).toISOString(),
        }),
      })
      if (!res.ok) {
        console.error(
          `[analytics] capture ${args.event} → HTTP ${res.status}`,
        )
      }
    } catch (err) {
      // Best-effort : on journalise mais on n'échoue jamais.
      console.error(`[analytics] capture ${args.event} failed`, err)
    }
    return null
  },
})
