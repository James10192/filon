import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Lecture interne du copilote pour la couche AFFILIATION (parrainage produit
 * Filon). Scopée `userId` (`by_referrer` / `by_user`), sans identité. Reprend
 * `referrals.myOverview` en forçant le `userId` côté serveur. Lecture seule : la
 * génération du code reste une mutation côté UI.
 */
export const referralOverview = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
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
      signedUp: refs.length,
      subscribed: refs.filter((r) => r.status === 'subscribed').length,
      freeMonths,
      pendingMonths,
    }
  },
})
