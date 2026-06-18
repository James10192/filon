import { v } from 'convex/values'
import { internalAction, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { planOf } from './lib/plan'
import { priceXof, PLAN_LABELS, type Interval, type PaidPlan } from './lib/pricing'

/**
 * Domaine billing · renouvellement d'abonnement (Axe 2, cron quotidien).
 *
 * Réalité XOF/Côte d'Ivoire : seule la CARTE donne une autorisation réutilisable
 * (auto-débit silencieux via Paystack /charge/authorization). Le mobile money
 * (Wave/Orange/MTN) est un paiement ponctuel sans mandat. Ce cron :
 *
 *  1. Pour la minorité avec carte : tente un débit silencieux ~48h AVANT
 *     l'échéance (max 2 tentatives, espacées d'un jour). Succès → prolonge la
 *     période + notifie « renouvelé ». Échec (2 fois) → bascule en relance.
 *  2. Pour tous les autres (mobile money, ou carte sans succès) : crée une
 *     relance de renouvellement (notification in-app à J-7/J-3/J-1) avec un lien
 *     de re-paiement pré-rempli, et flag l'e-mail (relais Resend optionnel).
 *  3. Après échéance dépassée + grâce : notification de downgrade gracieux. La
 *     bascule de palier elle-même reste à `billingLifecycle.processExpirations`
 *     (on ne supprime AUCUNE donnée). Ici on ne fait que prévenir.
 *
 * Bornage strict via l'index `by_planRenewsAt` (jamais de scan global). Tout le
 * réseau Paystack vit dans `paystackRenewal.ts` (action) ; ici, sélection +
 * écritures + orchestration.
 */

const DAY_MS = 24 * 60 * 60 * 1000
/** Fenêtre d'auto-débit carte : on tente dans les 48h avant l'échéance. */
const CHARGE_WINDOW_MS = 2 * DAY_MS
/** Plafond de tentatives d'auto-débit par période. */
const MAX_CHARGE_ATTEMPTS = 2
/** Jours de relance avant échéance. */
const REMINDER_DAYS = [7, 3, 1]
/** Tolérance (± 12h) pour matcher une relance à un palier de jours. */
const REMINDER_TOLERANCE_MS = 12 * 60 * 60 * 1000
/** Garde-fou de lot par exécution. */
const BATCH_LIMIT = 200

type Candidate = {
  docId: Doc<'users'>['_id']
  authId: string
  email: string
  plan: PaidPlan
  interval: Interval
  planRenewsAt: number
  cardAuthCode: string | null
  amountXof: number
  attempts: number
  lastChargeAttemptAt: number | null
}

/** Convertit une ligne user payante en candidat de renouvellement, ou null. */
function toCandidate(doc: Doc<'users'>): Candidate | null {
  const plan = planOf(doc.plan ?? null)
  if (plan === 'free') return null
  if (typeof doc.planRenewsAt !== 'number') return null
  // Souscription NATIVE (carte) : Paystack gère débit, retentes et dunning. Le
  // cron maison ne DOIT PAS la toucher (sinon doublon de relance/débit). On ne
  // garde que le régime 'manual' (mobile money / ponctuel) et les abonnements
  // pré-migration sans billingMode (traités comme 'manual').
  if (doc.billingMode === 'native') return null
  // Annulation programmée vers 'free' : pas de relance de renouvellement (le
  // user a explicitement coupé). Un downgrade vers un autre palier payant reste
  // un renouvellement (palier cible payé à l'échéance) → on le laisse passer.
  if (doc.pendingPlan === 'free') return null
  const interval: Interval = doc.planInterval ?? 'monthly'
  return {
    docId: doc._id,
    authId: doc.authId,
    email: doc.email,
    plan: plan as PaidPlan,
    interval,
    planRenewsAt: doc.planRenewsAt,
    cardAuthCode: doc.cardAuthCode ?? null,
    amountXof: priceXof(plan as PaidPlan, interval),
    attempts: doc.renewalAttempts ?? 0,
    lastChargeAttemptAt: doc.lastChargeAttemptAt ?? null,
  }
}

/**
 * `internal.billingRenewal.selectCandidates` : abonnements payants dont
 * l'échéance tombe sous 7 jours. Bornage via `by_planRenewsAt`. Le tri carte /
 * relance se fait dans l'action (pas d'appel réseau ici).
 */
export const selectCandidates = internalQuery({
  args: {},
  handler: async (ctx): Promise<Candidate[]> => {
    const now = Date.now()
    const horizon = now + 7 * DAY_MS
    const rows = await ctx.db
      .query('users')
      .withIndex('by_planRenewsAt', (q) =>
        q.gt('planRenewsAt', now).lte('planRenewsAt', horizon),
      )
      .take(BATCH_LIMIT)
    return rows
      .map(toCandidate)
      .filter((c): c is Candidate => c !== null)
  },
})

/** Le palier est-il dans la fenêtre d'auto-débit (≤ 48h, retry espacé d'1 j) ? */
function shouldAttemptCharge(c: Candidate, now: number): boolean {
  if (!c.cardAuthCode) return false
  if (c.attempts >= MAX_CHARGE_ATTEMPTS) return false
  if (c.planRenewsAt - now > CHARGE_WINDOW_MS) return false
  // Espace les tentatives : une seule par ~jour.
  if (c.lastChargeAttemptAt && now - c.lastChargeAttemptAt < DAY_MS) return false
  return true
}

/** Palier de relance (7/3/1) atteint aujourd'hui, ou null si aucun. */
function reminderDay(c: Candidate, now: number): number | null {
  const remaining = c.planRenewsAt - now
  for (const d of REMINDER_DAYS) {
    const target = d * DAY_MS
    if (Math.abs(remaining - target) <= REMINDER_TOLERANCE_MS) return d
  }
  return null
}

function fmtXof(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} XOF`
}

/**
 * `internal.billingRenewal.runRenewals` : entrée du cron quotidien. Orchestre
 * auto-débit carte (avec écritures de période/tentative via mutations) et
 * relances in-app. Idempotent au niveau jour : les compteurs (`renewalAttempts`,
 * `renewalReminderAt`) évitent les doublons.
 */
export const runRenewals = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ charged: number; remindersSent: number; failures: number }> => {
    const now = Date.now()
    const candidates = await ctx.runQuery(internal.billingRenewal.selectCandidates, {})

    let charged = 0
    let remindersSent = 0
    let failures = 0

    for (const c of candidates) {
      if (shouldAttemptCharge(c, now)) {
        const result = await ctx.runAction(
          internal.paystackRenewal.chargeAuthorization,
          { email: c.email, authorizationCode: c.cardAuthCode!, amountXof: c.amountXof },
        )
        if (result.ok) {
          await ctx.runMutation(internal.billing.extendPaidPeriod, {
            userId: c.docId,
            nextRenewsAt: c.planRenewsAt + (c.interval === 'annual' ? 365 : 30) * DAY_MS,
          })
          await ctx.runMutation(internal.notifications.create, {
            userId: c.authId,
            kind: 'renewal_charged',
            title: 'Abonnement renouvelé',
            body: `Votre palier ${PLAN_LABELS[c.plan]} a été renouvelé (${fmtXof(c.amountXof)}).`,
            actionUrl: '/app/tarifs',
            meta: JSON.stringify({ plan: c.plan, interval: c.interval, amountXof: c.amountXof }),
          })
          charged += 1
          continue
        }
        // Échec : compter la tentative.
        await ctx.runMutation(internal.billing.markChargeAttempt, { userId: c.docId })
        failures += 1
        const willRetry = c.attempts + 1 < MAX_CHARGE_ATTEMPTS
        await ctx.runMutation(internal.notifications.create, {
          userId: c.authId,
          kind: 'renewal_failed',
          title: 'Échec du renouvellement automatique',
          body: willRetry
            ? `Le débit de ${fmtXof(c.amountXof)} a échoué. Nouvelle tentative demain, ou renouvelez manuellement.`
            : `Le débit de ${fmtXof(c.amountXof)} a échoué. Renouvelez manuellement pour conserver ${PLAN_LABELS[c.plan]}.`,
          actionUrl: '/app/tarifs',
          meta: JSON.stringify({ plan: c.plan, interval: c.interval, amountXof: c.amountXof }),
        })
        continue
      }

      // Pas d'auto-débit (mobile money, ou carte hors fenêtre/épuisée) → relance
      // aux paliers J-7/J-3/J-1, une seule fois par palier (flag `renewalReminderAt`).
      const day = reminderDay(c, now)
      if (day === null) continue
      const flagged = await ctx.runMutation(internal.billingRenewal.flagReminder, {
        userId: c.docId,
      })
      if (!flagged) continue
      await ctx.runMutation(internal.notifications.create, {
        userId: c.authId,
        kind: 'renewal_reminder',
        title: `Renouvellement dans ${day} jour${day > 1 ? 's' : ''}`,
        body: `Votre palier ${PLAN_LABELS[c.plan]} expire bientôt. Renouvelez (${fmtXof(c.amountXof)}) pour ne pas perdre l'accès.`,
        actionUrl: '/app/tarifs',
        meta: JSON.stringify({ plan: c.plan, interval: c.interval, amountXof: c.amountXof, day }),
      })
      remindersSent += 1
    }

    return { charged, remindersSent, failures }
  },
})

/**
 * `internal.billingRenewal.flagReminder` : pose `renewalReminderAt` si le user
 * n'a pas déjà été relancé dans les dernières 24h, pour éviter un doublon de
 * relance le même jour. Retourne true si la relance doit être créée.
 */
export const flagReminder = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args): Promise<boolean> => {
    const doc = await ctx.db.get(args.userId)
    if (!doc) return false
    const now = Date.now()
    if (
      typeof doc.renewalReminderAt === 'number' &&
      now - doc.renewalReminderAt < DAY_MS
    ) {
      return false
    }
    await ctx.db.patch(args.userId, { renewalReminderAt: now })
    return true
  },
})
