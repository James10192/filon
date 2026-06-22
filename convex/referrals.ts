import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser, type MutationCtx } from './lib/withUser'
import {
  REWARD_FREE_MS,
  makeReferralCode,
  normalizeCode,
} from './lib/referral'
import { trackServer, SERVER_EVENTS } from './lib/track'

/**
 * Affiliation Filon (parrainage produit). Scope strict par parrain (`by_referrer`).
 *
 * Boucle : un user partage son `referralCode` (lien `?ref=CODE`) → un filleul
 * s'inscrit et `claimReferral` pose le lien → a la 1re conversion payante du
 * filleul, `billing.applySubscription` appelle `processReferralOnConversion`
 * qui octroie UN mois offert au parrain ET au filleul (double face), une seule
 * fois (`referrals.rewardGranted`). Aucun versement d'argent : marge protegee.
 */

/** Resout la ligne `users` applicative d'un authId (ou null). */
async function userDoc(
  ctx: MutationCtx,
  authId: string,
): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', authId))
    .unique()
}

/** Genere un code unique (anti-collision via l'index `by_referralCode`). */
async function freshCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeReferralCode(Math.random)
    const clash = await ctx.db
      .query('users')
      .withIndex('by_referralCode', (q) => q.eq('referralCode', code))
      .unique()
    if (!clash) return code
  }
  // Extremement improbable : suffixe horodate en dernier recours.
  return makeReferralCode(Math.random) + String(Date.now() % 1000)
}

/** Vue d'ensemble du parrainage du user courant (lien, filleuls, gains). */
export const myOverview = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    const doc = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', userId))
      .unique()
    const refs = await ctx.db
      .query('referrals')
      .withIndex('by_referrer', (q) => q.eq('referrerUserId', userId))
      .collect()
    const rewards = await ctx.db
      .query('referralRewards')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const freeMonths = rewards.filter(
      (r) => r.kind === 'free_month' && r.status === 'granted',
    ).length
    const pendingMonths = rewards.filter(
      (r) => r.kind === 'free_month' && r.status === 'pending',
    ).length
    return {
      code: doc?.referralCode ?? null,
      referrals: refs
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((r) => ({
          email: r.refereeEmail ?? null,
          status: r.status,
          createdAt: r.createdAt,
        })),
      signedUp: refs.length,
      subscribed: refs.filter((r) => r.status === 'subscribed').length,
      freeMonths,
      pendingMonths,
    }
  },
})

/** Genere (paresseusement) et renvoie le code de parrainage du user courant. */
export const ensureMyCode = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, email } = await requireUser(ctx)
    const doc = await userDoc(ctx, userId)
    if (doc?.referralCode) return doc.referralCode
    const code = await freshCode(ctx)
    if (doc) {
      await ctx.db.patch(doc._id, { referralCode: code })
    } else {
      await ctx.db.insert('users', {
        authId: userId,
        email,
        referralCode: code,
        createdAt: Date.now(),
      })
    }
    return code
  },
})

/**
 * Pose le lien de parrainage sur le user courant (UNE seule fois). Best-effort :
 * ne throw jamais (l'attribution ne doit pas casser le flux d'inscription), elle
 * renvoie un statut. Anti auto-parrainage, anti code inconnu, anti re-liaison.
 */
export const claimReferral = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const { userId, email } = await requireUser(ctx)
    const doc = await userDoc(ctx, userId)
    if (!doc) return { ok: false as const, reason: 'no_user' }
    if (doc.referredByCode) return { ok: false as const, reason: 'already' }
    const norm = normalizeCode(code)
    if (!norm) return { ok: false as const, reason: 'empty' }
    if (doc.referralCode && norm === doc.referralCode) {
      return { ok: false as const, reason: 'self' }
    }
    const referrer = await ctx.db
      .query('users')
      .withIndex('by_referralCode', (q) => q.eq('referralCode', norm))
      .unique()
    if (!referrer) return { ok: false as const, reason: 'unknown' }
    if (referrer.authId === userId) return { ok: false as const, reason: 'self' }

    await ctx.db.patch(doc._id, {
      referredByCode: norm,
      referredByUserId: referrer.authId,
    })
    await ctx.db.insert('referrals', {
      referrerUserId: referrer.authId,
      refereeUserId: userId,
      refereeEmail: email || undefined,
      code: norm,
      status: 'signed_up',
      rewardGranted: false,
      createdAt: Date.now(),
    })
    // Funnel parrainage · le filleul a rattaché un code à l'inscription. On
    // l'attribue au PARRAIN (sa filière MLM grandit) et au filleul (dimension
    // referral_source pour mesurer le levier viral).
    trackServer(ctx, referrer.authId, SERVER_EVENTS.referral_claimed, {
      code: norm,
      referee_id: userId,
    })
    return { ok: true as const }
  },
})

/** Prolonge la periode payee d'un user de +30 j (mois offert). No-op si pas de doc. */
async function extendPeriod(ctx: MutationCtx, authId: string): Promise<boolean> {
  const doc = await userDoc(ctx, authId)
  if (!doc) return false
  const base = Math.max(doc.planRenewsAt ?? 0, Date.now())
  await ctx.db.patch(doc._id, { planRenewsAt: base + REWARD_FREE_MS })
  return true
}

/** Le user est-il actuellement sur une periode payee active ? */
function isPaidNow(doc: Doc<'users'> | null): boolean {
  return Boolean(
    doc && doc.plan && doc.plan !== 'free' && (doc.planRenewsAt ?? 0) > Date.now(),
  )
}

/**
 * Octroi de recompense a la conversion payante d'un user. Appele dans la MEME
 * transaction par `billing.applySubscription` (helper, pas un runMutation).
 * Idempotent (filet `referrals.rewardGranted`), donc sans effet sur les
 * renouvellements suivants. Fait DEUX choses :
 *  1. Applique les mois offerts EN ATTENTE que ce user a gagnes comme parrain
 *     (s'il etait gratuit au moment ou ses filleuls ont converti).
 *  2. Si ce user est lui-meme un filleul : marque sa ligne 'subscribed', lui
 *     offre 1 mois (bonus de bienvenue) et offre 1 mois a son parrain (immediat
 *     si le parrain est payant, sinon 'pending' jusqu'a son propre abonnement).
 */
export async function applyReferralReward(
  ctx: MutationCtx,
  refereeUserId: string,
  plan: string,
): Promise<void> {
  const now = Date.now()

  // 1. Appliquer les mois en attente gagnes comme parrain.
  const pendings = await ctx.db
    .query('referralRewards')
    .withIndex('by_user_status', (q) =>
      q.eq('userId', refereeUserId).eq('status', 'pending'),
    )
    .collect()
  for (const reward of pendings) {
    if (reward.kind !== 'free_month') continue
    await extendPeriod(ctx, refereeUserId)
    await ctx.db.patch(reward._id, { status: 'granted', grantedAt: now })
  }

  // 2. Ce user est-il un filleul pas encore recompense ?
  const ref = await ctx.db
    .query('referrals')
    .withIndex('by_referee', (q) => q.eq('refereeUserId', refereeUserId))
    .unique()
  if (!ref || ref.rewardGranted || ref.status === 'churned') return

  await ctx.db.patch(ref._id, {
    status: 'subscribed',
    rewardGranted: true,
    subscribedAt: now,
    refereePlan: plan,
  })

  // Bonus de bienvenue au filleul (il vient de payer → periode active).
  await extendPeriod(ctx, refereeUserId)
  await ctx.db.insert('referralRewards', {
    userId: refereeUserId,
    referralId: ref._id,
    kind: 'free_month',
    amount: 30,
    status: 'granted',
    createdAt: now,
    grantedAt: now,
  })

  // Recompense au parrain : immediate s'il est payant, sinon en attente.
  const referrer = await userDoc(ctx, ref.referrerUserId)
  const paid = isPaidNow(referrer)
  if (paid) await extendPeriod(ctx, ref.referrerUserId)
  await ctx.db.insert('referralRewards', {
    userId: ref.referrerUserId,
    referralId: ref._id,
    kind: 'free_month',
    amount: 30,
    status: paid ? 'granted' : 'pending',
    createdAt: now,
    grantedAt: paid ? now : undefined,
  })

  // Funnel parrainage · récompense déclenchée par la conversion payante du
  // filleul. Attribuée au parrain (le bénéficiaire de la filière). `applied_now`
  // distingue le mois offert immédiat (parrain déjà payant) du mois en attente.
  trackServer(ctx, ref.referrerUserId, SERVER_EVENTS.referral_reward_granted, {
    referee_id: refereeUserId,
    referee_plan: plan,
    kind: 'free_month',
    applied_now: paid,
  })
}
