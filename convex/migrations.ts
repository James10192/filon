import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireAdmin } from './lib/withUser'

export const getRun = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    return ctx.db.query('migrationRuns').withIndex('by_name', (q) => q.eq('name', args.name)).unique()
  },
})

export const recordRun = mutation({
  args: { name: v.string(), status: v.union(v.literal('running'), v.literal('completed'), v.literal('failed')), processedCount: v.number(), cursor: v.optional(v.string()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const existing = await ctx.db.query('migrationRuns').withIndex('by_name', (q) => q.eq('name', args.name)).unique()
    const now = Date.now()
    const patch = { status: args.status, processedCount: args.processedCount, ...(args.cursor !== undefined ? { cursor: args.cursor } : {}), ...(args.error ? { error: args.error } : {}), ...(args.status === 'running' ? {} : { completedAt: now }) }
    if (existing) { await ctx.db.patch(existing._id, patch); return existing._id }
    return ctx.db.insert('migrationRuns', { name: args.name, ...patch, startedAt: now })
  },
})
