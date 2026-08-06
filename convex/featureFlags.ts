import { v } from 'convex/values'
import { query } from './_generated/server'
import { requireUser } from './lib/withUser'

function bucket(userId: string, key: string): number {
  let value = 0
  for (const char of `${key}:${userId}`) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value % 100
}

export const isEnabled = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const override = await ctx.db.query('featureFlagOverrides').withIndex('by_flag_user', (q) => q.eq('flagKey', args.key).eq('userId', userId)).unique()
    if (override) return override.enabled
    const flag = await ctx.db.query('featureFlags').withIndex('by_key', (q) => q.eq('key', args.key)).unique()
    return Boolean(flag?.enabled && bucket(userId, args.key) < flag.rolloutPercent)
  },
})
