import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { planOf, type Plan } from './lib/plan'

/**
 * Domaine billing · cycle de vie d'abonnement côté cron (échéance + relance).
 *
 * Séparé de `billing.ts` (qui porte l'application du palier et les mutations
 * utilisateur) : ici vit la logique PLANIFIÉE, déclenchée par `convex/crons.ts`.
 *
 * Modèle de récurrence (rappel ROADMAP) : la facturation est un PAIEMENT
 * PONCTUEL couvrant la période choisie (le mobile money ne donne pas
 * d'autorisation réutilisable ; la vraie récurrence carte est le suivi #21).
 * Il n'existe donc pas (encore) de prélèvement automatique : à l'échéance, sans
 * nouveau paiement, l'accès payant retombe sur 'free'.
 *
 * Décisions du cron d'échéance (`processExpirations`), pour un user dont
 * `planRenewsAt` est dans le passé :
 *  1. `pendingPlan` défini → on l'applique (downgrade programmé OU 'free' issu
 *     d'une annulation), puis on l'efface. La période payée étant terminée, le
 *     palier appliqué démarre sans nouvelle échéance (planRenewsAt effacé) ; un
 *     futur paiement reposera une échéance.
 *  2. sinon `autoRenew === false` → annulation simple → 'free'.
 *  3. sinon (autoRenew vrai/absent, pas de pending) → pas de récurrence réelle
 *     disponible → 'free' également. La relance (étape de rappel ci-dessous)
 *     a déjà prévenu l'utilisateur AVANT l'échéance pour qu'il se réabonne.
 *
 * On ne supprime JAMAIS de donnée utilisateur : seuls les champs de palier
 * changent. Les bornes via l'index `by_planRenewsAt` évitent tout scan global.
 */

/** Fenêtre de relance avant échéance (3 jours). */
const REMINDER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000
/** Garde-fou anti-boucle sur le lot traité par exécution. */
const BATCH_LIMIT = 200
/**
 * Période de grâce après échéance avant le downgrade automatique vers 'free',
 * pour un abonnement simplement non renouvelé (ni annulation explicite, ni
 * downgrade programmé). Le user garde l'accès payant quelques jours de plus,
 * laissant le temps à une relance / un re-paiement d'aboutir. Les annulations
 * et downgrades EXPLICITES (`autoRenew === false`, `pendingPlan`) s'appliquent,
 * eux, dès l'échéance (choix intentionnel du user).
 */
const GRACE_MS = 5 * 24 * 60 * 60 * 1000

type LifecyclePatch = {
  plan?: Plan
  autoRenew?: boolean
  pendingPlan?: undefined
  planInterval?: undefined
  planRenewsAt?: undefined
  subscriptionRef?: undefined
}

/** Calcule le palier cible à appliquer à l'échéance d'un abonnement échu. */
function resolveExpiredPlan(doc: Doc<'users'>): Plan {
  if (doc.pendingPlan) return doc.pendingPlan
  // Pas de pending : annulation explicite OU absence de récurrence réelle →
  // dans les deux cas, retour au palier gratuit (cf. en-tête).
  return 'free'
}

/**
 * `internal.billingLifecycle.processExpirations` : applique les transitions de
 * fin de période. Itère, via l'index `by_planRenewsAt`, les users dont
 * l'échéance est passée (bornage strict, pas de scan global), et pose le palier
 * cible. Idempotent : une fois `planRenewsAt` effacé, le user n'est plus repris.
 */
export const processExpirations = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ processed: number }> => {
    const now = Date.now()
    // Bornage : seules les lignes avec une échéance dans le passé. Les lignes
    // sans `planRenewsAt` (free, jamais payé) sont hors de cette plage d'index.
    const due = await ctx.db
      .query('users')
      .withIndex('by_planRenewsAt', (q) => q.lt('planRenewsAt', now))
      .take(BATCH_LIMIT)

    let processed = 0
    for (const doc of due) {
      // L'index inclut les lignes où planRenewsAt est absent (indexé comme
      // « undefined », trié avant tout nombre). On ne traite que les échéances
      // numériques réellement dépassées.
      if (typeof doc.planRenewsAt !== 'number' || doc.planRenewsAt >= now) {
        continue
      }
      // Souscription NATIVE (carte) : la fin de période est pilotée par le
      // webhook `subscription.disable`. NE PAS rétrograder ici (sinon double
      // downgrade cron + webhook). Le cron ne traite que 'manual' + legacy.
      if (doc.billingMode === 'native') {
        continue
      }
      // Transition EXPLICITE (annulation `autoRenew=false` ou downgrade
      // programmé `pendingPlan`) ? Elle s'applique dès l'échéance. Sinon, c'est
      // un simple non-renouvellement : on respecte la période de grâce.
      const explicit = doc.autoRenew === false || doc.pendingPlan !== undefined
      if (!explicit && now < doc.planRenewsAt + GRACE_MS) {
        continue
      }

      const wasPaid = planOf(doc.plan ?? null) !== 'free'
      const target = resolveExpiredPlan(doc)
      const patch: LifecyclePatch = {
        plan: target,
        // Fin de la période payée : on efface l'échéance et les métadonnées de
        // période. Un futur paiement les reposera (applySubscription).
        planRenewsAt: undefined,
        planInterval: undefined,
        pendingPlan: undefined,
        subscriptionRef: undefined,
      }
      // Sur 'free' on coupe aussi le renouvellement (cohérence d'état).
      if (target === 'free') patch.autoRenew = false
      await ctx.db.patch(doc._id, patch)

      // Notification de downgrade gracieux (paiement → free). On insère
      // directement (une mutation ne peut pas appeler une autre mutation). Aucune
      // donnée utilisateur n'est supprimée : seul le palier change.
      if (wasPaid && target === 'free') {
        await ctx.db.insert('notifications', {
          userId: doc.authId,
          kind: 'downgraded',
          title: 'Passage au palier Découverte',
          body: "Votre abonnement n'a pas été renouvelé. Vos données sont conservées ; repassez Pro quand vous voulez.",
          actionUrl: '/app/tarifs',
          read: false,
          emailSent: false,
          createdAt: now,
        })
      }
      processed += 1
    }
    return { processed }
  },
})

/**
 * `internal.billingLifecycle.flagRenewalReminders` : SUPERSÉDÉ par
 * `billingRenewal.runRenewals` (Axe 2), qui couvre la relance (J-7/J-3/J-1) ET
 * l'auto-débit carte ET les notifications in-app. Conservé (non câblé au cron)
 * pour rétro-compatibilité d'appel manuel ; ne pas re-câbler en parallèle de
 * `runRenewals` (les deux posent `renewalReminderAt`).
 *
 * Repère les abonnements payants dont l'échéance approche (≤ 3 j) et qui n'ont
 * pas encore été relancés pour la période en cours, puis pose `renewalReminderAt`.
 *
 * On ne relance pas les users en annulation programmée vers 'free' au-delà de
 * leur première relance (le flag pose `renewalReminderAt`, donc une seule fois
 * par période). On relance toutefois ceux en downgrade programmé (changement de
 * palier, pas perte d'accès) pour information.
 */
export const flagRenewalReminders = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ flagged: number; reminders: Array<{ userId: string; email: string; planRenewsAt: number }> }> => {
    const now = Date.now()
    const horizon = now + REMINDER_WINDOW_MS
    // Échéances comprises entre maintenant et +3 j.
    const soon = await ctx.db
      .query('users')
      .withIndex('by_planRenewsAt', (q) =>
        q.gt('planRenewsAt', now).lte('planRenewsAt', horizon),
      )
      .take(BATCH_LIMIT)

    const reminders: Array<{ userId: string; email: string; planRenewsAt: number }> = []
    let flagged = 0
    for (const doc of soon) {
      if (typeof doc.planRenewsAt !== 'number') continue
      if (planOf(doc.plan ?? null) === 'free') continue
      // Déjà relancé pour cette période (flag postérieur au début de période) ?
      if (
        typeof doc.renewalReminderAt === 'number' &&
        doc.renewalReminderAt >= now - REMINDER_WINDOW_MS
      ) {
        continue
      }
      await ctx.db.patch(doc._id, { renewalReminderAt: now })
      reminders.push({
        userId: doc.authId,
        email: doc.email,
        planRenewsAt: doc.planRenewsAt,
      })
      flagged += 1
    }
    // Point d'accroche relance : `reminders` est prêt à être consommé par un
    // futur envoi (e-mail / push). Retourné pour observabilité (logs cron).
    return { flagged, reminders }
  },
})
