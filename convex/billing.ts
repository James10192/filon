import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser } from './lib/withUser'
import { PLAN_LIMITS, planOf, type Plan } from './lib/plan'

/**
 * Domaine billing · état d'abonnement côté Convex (facturation maison).
 *
 * Le composant NPM `@convex-dev/better-auth` ne supporte pas le plugin `stripe`
 * de Better Auth, et de toute façon le PSP ici est Paystack (XOF + mobile money
 * + carte, Côte d'Ivoire). On pose donc le palier nous-mêmes :
 *  - `paystack.startCheckout` (action) lance le paiement,
 *  - le webhook signé `http /paystack/webhook` appelle `applySubscription` ici,
 *  - les internalMutations ci-dessous écrivent `plan` / `planRenewsAt` / refs.
 *
 * Les écritures de palier passent par des `internalMutation` (jamais appelables
 * par le client) : seul le webhook signé et l'outillage propriétaire (dev) les
 * déclenchent. Le client ne peut PAS s'auto-promouvoir.
 */

const planValidator = v.union(
  v.literal('free'),
  v.literal('pro'),
  v.literal('pro_ai'),
  v.literal('copilot'),
)

const intervalValidator = v.union(
  v.literal('monthly'),
  v.literal('annual'),
)

/** Résout la ligne `users` par identifiant Better Auth. */
async function userByAuthId(
  ctx: { db: any },
  authId: string,
): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_authId', (q: any) => q.eq('authId', authId))
    .unique()
}

/**
 * `api.billing.myPlan` : palier effectif + limites du user courant, pour la
 * page Tarifs, le badge de palier et l'UI d'upsell. Ne throw pas hors session.
 */
export const myPlan = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    plan: Plan
    planInterval: 'monthly' | 'annual' | null
    planRenewsAt: number | null
    autoRenew: boolean
    pendingPlan: Plan | null
    // Métadonnées carte enregistrée (auto-débit possible) ou null si aucune /
    // paiement mobile money. Permet à l'UI d'afficher « Visa ···· 4242 ».
    card: { last4: string; bank: string | null; brand: string | null } | null
    limits: (typeof PLAN_LIMITS)[Plan]
  } | null> => {
    const authUser = await (async () => {
      try {
        return await requireUser(ctx)
      } catch {
        return null
      }
    })()
    if (!authUser) return null

    const doc = await userByAuthId(ctx, authUser.userId)
    const plan = planOf(doc?.plan ?? null)
    return {
      plan,
      planInterval: doc?.planInterval ?? null,
      planRenewsAt: doc?.planRenewsAt ?? null,
      // Absence d'`autoRenew` = renouvellement actif par défaut.
      autoRenew: doc?.autoRenew ?? true,
      pendingPlan: doc?.pendingPlan ?? null,
      card: doc?.cardAuthCode
        ? {
            last4: doc.cardLast4 ?? '????',
            bank: doc.cardBank ?? null,
            brand: doc.cardBrand ?? null,
          }
        : null,
      limits: PLAN_LIMITS[plan],
    }
  },
})

/** Ordre des paliers, pour distinguer un downgrade d'un upgrade. */
const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  pro: 1,
  pro_ai: 2,
  copilot: 3,
}

/**
 * `api.billing.scheduleDowngrade` : programme une rétrogradation de palier
 * appliquée À L'ÉCHÉANCE (`planRenewsAt`), pas immédiatement. Le user garde ce
 * qu'il a payé jusqu'à la fin de la période, puis le cron applique `pendingPlan`.
 *
 * Cas couverts : pro_ai → pro, et plus généralement tout palier strictement
 * inférieur au palier courant. Pour rétrograder vers 'free', utiliser plutôt
 * `cancelAutoRenew` (sémantique d'annulation). Un upgrade, lui, passe par un
 * nouveau paiement (startCheckout), jamais par ici.
 */
export const scheduleDowngrade = mutation({
  args: { target: planValidator },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await userByAuthId(ctx, userId)
    if (!doc) throw new Error('Profil introuvable')

    const current = planOf(doc.plan ?? null)
    if (PLAN_RANK[args.target] >= PLAN_RANK[current]) {
      throw new Error(
        'Une montée en palier se fait via un paiement, pas une programmation.',
      )
    }
    if (!doc.planRenewsAt) {
      throw new Error("Aucune période payée en cours à l'échéance de laquelle programmer.")
    }
    // Programme le palier cible ; le renouvellement auto reste tel quel (le user
    // continue de payer, mais le palier baissera). pendingPlan='free' relève de
    // cancelAutoRenew, pas d'ici.
    await ctx.db.patch(doc._id, { pendingPlan: args.target })
    return null
  },
})

/**
 * `api.billing.cancelAutoRenew` : coupe le renouvellement automatique. L'accès
 * payant reste actif jusqu'à `planRenewsAt`, puis le cron rétrograde en 'free'.
 * On ne supprime AUCUNE donnée : seuls les champs de palier changent à terme.
 */
export const cancelAutoRenew = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await userByAuthId(ctx, userId)
    if (!doc) throw new Error('Profil introuvable')
    if (planOf(doc.plan ?? null) === 'free') {
      throw new Error('Aucun abonnement payant à annuler.')
    }
    await ctx.db.patch(doc._id, { autoRenew: false, pendingPlan: 'free' })
    return null
  },
})

/**
 * `api.billing.reactivateAutoRenew` : réactive le renouvellement (annule une
 * annulation ou un downgrade programmé) TANT QUE la période payée n'est pas
 * échue. Au-delà, il faut repasser par un paiement.
 */
export const reactivateAutoRenew = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await userByAuthId(ctx, userId)
    if (!doc) throw new Error('Profil introuvable')
    if (planOf(doc.plan ?? null) === 'free') {
      throw new Error('Aucun abonnement payant à réactiver.')
    }
    if (doc.planRenewsAt && doc.planRenewsAt < Date.now()) {
      throw new Error('Période échue : relancez un paiement pour réactiver.')
    }
    await ctx.db.patch(doc._id, {
      autoRenew: true,
      pendingPlan: undefined,
      renewalReminderAt: undefined,
    })
    return null
  },
})

/**
 * `internal.billing.applySubscription` : pose un palier payant sur un user.
 * Appelée par le webhook Paystack (charge.success / subscription.create) après
 * vérification de signature, et par l'outillage dev. Patch dynamique : jamais
 * `undefined` injecté. Résout le user par `authId` (metadata.userId) puis, à
 * défaut, par e-mail.
 */
export const applySubscription = internalMutation({
  args: {
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    plan: planValidator,
    planInterval: v.optional(intervalValidator),
    planRenewsAt: v.optional(v.number()),
    subscriptionRef: v.optional(v.string()),
    paystackCustomerCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    let doc: Doc<'users'> | null = null
    if (args.userId) doc = await userByAuthId(ctx, args.userId)
    if (!doc && args.email) {
      doc = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', args.email!))
        .unique()
    }
    if (!doc) return false

    const patch: {
      plan: Plan
      planInterval?: 'monthly' | 'annual'
      planRenewsAt?: number
      subscriptionRef?: string
      paystackCustomerCode?: string
      // Un paiement réussi remet le cycle de vie « propre » : on réactive le
      // renouvellement, on efface tout downgrade/annulation programmé et on
      // remet à zéro le compteur de tentatives d'auto-débit de la période.
      autoRenew: true
      pendingPlan: undefined
      renewalReminderAt: undefined
      renewalAttempts: undefined
      lastChargeAttemptAt: undefined
    } = {
      plan: args.plan,
      autoRenew: true,
      pendingPlan: undefined,
      renewalReminderAt: undefined,
      renewalAttempts: undefined,
      lastChargeAttemptAt: undefined,
    }
    if (args.planInterval !== undefined) patch.planInterval = args.planInterval
    if (args.planRenewsAt !== undefined) patch.planRenewsAt = args.planRenewsAt
    if (args.subscriptionRef !== undefined) {
      patch.subscriptionRef = args.subscriptionRef
    }
    if (args.paystackCustomerCode !== undefined) {
      patch.paystackCustomerCode = args.paystackCustomerCode
    }

    await ctx.db.patch(doc._id, patch)
    return true
  },
})

/**
 * `internal.billing.saveCardAuthorization` : mémorise une autorisation carte
 * RÉUTILISABLE Paystack sur la ligne user, pour l'auto-débit du cron de
 * renouvellement. Appelée par `verifyCheckout`/webhook UNIQUEMENT quand
 * `authorization.reusable === true` (carte) ; jamais pour le mobile money
 * (paiement ponctuel sans mandat). Patch dynamique, jamais d'`undefined`.
 */
export const saveCardAuthorization = internalMutation({
  args: {
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    authorizationCode: v.string(),
    last4: v.optional(v.string()),
    bank: v.optional(v.string()),
    brand: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    let doc: Doc<'users'> | null = null
    if (args.userId) doc = await userByAuthId(ctx, args.userId)
    if (!doc && args.email) {
      doc = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', args.email!))
        .unique()
    }
    if (!doc) return false

    const patch: {
      cardAuthCode: string
      cardLast4?: string
      cardBank?: string
      cardBrand?: string
    } = { cardAuthCode: args.authorizationCode }
    if (args.last4 !== undefined) patch.cardLast4 = args.last4
    if (args.bank !== undefined) patch.cardBank = args.bank
    if (args.brand !== undefined) patch.cardBrand = args.brand

    await ctx.db.patch(doc._id, patch)
    return true
  },
})

/**
 * `internal.billing.extendPaidPeriod` : prolonge la période payée après un
 * auto-débit carte RÉUSSI (POST /charge/authorization). Repousse `planRenewsAt`
 * d'un cycle, conserve le palier/intervalle, et remet le cycle de vie « propre »
 * (renouvellement actif, compteurs de relance/tentatives effacés). Idempotence :
 * appelée une seule fois par succès de débit (le cron borne via les compteurs).
 */
export const extendPaidPeriod = internalMutation({
  args: { userId: v.id('users'), nextRenewsAt: v.number() },
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.patch(args.userId, {
      planRenewsAt: args.nextRenewsAt,
      autoRenew: true,
      pendingPlan: undefined,
      renewalReminderAt: undefined,
      renewalAttempts: undefined,
      lastChargeAttemptAt: undefined,
    })
    return null
  },
})

/**
 * `internal.billing.markChargeAttempt` : incrémente le compteur de tentatives
 * d'auto-débit (cap géré par le cron) et horodate la tentative, après un échec
 * de POST /charge/authorization. Sépare l'écriture (mutation) de l'appel réseau
 * (action), pour rester dans les contraintes Convex.
 */
export const markChargeAttempt = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args): Promise<null> => {
    const doc = await ctx.db.get(args.userId)
    if (!doc) return null
    await ctx.db.patch(args.userId, {
      renewalAttempts: (doc.renewalAttempts ?? 0) + 1,
      lastChargeAttemptAt: Date.now(),
    })
    return null
  },
})

/**
 * `internal.billing.cancelSubscription` : rétrograde un user au palier gratuit
 * (subscription.disable / non-renouvellement). On ne supprime AUCUNE donnée :
 * on retire seulement les privilèges payants. Résout par `subscriptionRef`,
 * `paystackCustomerCode` ou e-mail.
 */
export const cancelSubscription = internalMutation({
  args: {
    subscriptionRef: v.optional(v.string()),
    paystackCustomerCode: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    let doc: Doc<'users'> | null = null
    if (args.paystackCustomerCode) {
      doc = await ctx.db
        .query('users')
        .withIndex('by_paystackCustomer', (q) =>
          q.eq('paystackCustomerCode', args.paystackCustomerCode!),
        )
        .unique()
    }
    if (!doc && args.subscriptionRef) {
      const all = await ctx.db.query('users').collect()
      doc = all.find((u) => u.subscriptionRef === args.subscriptionRef) ?? null
    }
    if (!doc && args.email) {
      doc = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', args.email!))
        .unique()
    }
    if (!doc) return false

    await ctx.db.patch(doc._id, { plan: 'free' })
    return true
  },
})

/**
 * `internal.billing.lookupUserByCustomer` : résout (userId, email) depuis un
 * code client / e-mail Paystack. Utilisé par l'action de vérification pour
 * recoller l'identité applicative depuis la réponse Paystack.
 */
export const lookupUserByCustomer = internalMutation({
  args: { paystackCustomerCode: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ userId: string; email: string } | null> => {
    const doc = await ctx.db
      .query('users')
      .withIndex('by_paystackCustomer', (q) =>
        q.eq('paystackCustomerCode', args.paystackCustomerCode),
      )
      .unique()
    if (!doc) return null
    return { userId: doc.authId, email: doc.email }
  },
})

/**
 * `internal.billing.setPaystackCustomerCode` : mémorise le code client Paystack
 * sur la ligne user (renseigné à l'initialisation de la transaction quand on le
 * connaît), pour relier les futurs webhooks.
 */
export const setPaystackCustomerCode = internalMutation({
  args: { userId: v.string(), paystackCustomerCode: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const doc = await userByAuthId(ctx, args.userId)
    if (doc) {
      await ctx.db.patch(doc._id, {
        paystackCustomerCode: args.paystackCustomerCode,
      })
    }
    return null
  },
})

/**
 * `api.billing.devSetPlan` : OUTIL DE DOGFOODING (propriétaire).
 *
 * Permet de poser son propre palier sans passer par Paystack, pour ne pas être
 * bridé par les limites freemium en développement. NON destructif (ne touche
 * que `plan`/`planInterval`). Gardé par une variable d'env `OWNER_AUTH_ID` :
 * seul le user dont l'`authId` correspond peut s'auto-promouvoir. À défaut
 * d'`OWNER_AUTH_ID`, la mutation refuse (sécurité par défaut).
 *
 * Marcel l'invoque via :
 *   npx convex run billing:devSetPlan '{"plan":"pro_ai"}'
 * (depuis une session authentifiée — voir le rapport pour l'alternative CLI).
 */
export const devSetPlan = mutation({
  args: { plan: planValidator, planInterval: v.optional(intervalValidator) },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const owner = process.env.OWNER_AUTH_ID
    if (!owner || owner !== userId) {
      throw new Error(
        'Réservé au propriétaire (définir OWNER_AUTH_ID = votre authId).',
      )
    }
    const doc = await userByAuthId(ctx, userId)
    if (!doc) throw new Error('Profil introuvable')
    const patch: { plan: Plan; planInterval?: 'monthly' | 'annual' } = {
      plan: args.plan,
    }
    if (args.planInterval !== undefined) patch.planInterval = args.planInterval
    await ctx.db.patch(doc._id, patch)
    return null
  },
})

/**
 * `internal.billing.setPlanByEmail` : pose un palier par e-mail, SANS session.
 * Permet à Marcel de se promouvoir en une commande CLI non interactive :
 *   npx convex run billing:setPlanByEmail '{"email":"...","plan":"pro_ai"}'
 * (internalMutation = non exposée au client, mais invocable via `convex run`).
 */
export const setPlanByEmail = internalMutation({
  args: {
    email: v.string(),
    plan: planValidator,
    planInterval: v.optional(intervalValidator),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const doc = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique()
    if (!doc) return false
    const patch: { plan: Plan; planInterval?: 'monthly' | 'annual' } = {
      plan: args.plan,
    }
    if (args.planInterval !== undefined) patch.planInterval = args.planInterval
    await ctx.db.patch(doc._id, patch)
    return true
  },
})
