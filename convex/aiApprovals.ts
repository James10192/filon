import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { internal } from './_generated/api'
import { requireUser } from './lib/withUser'

export const respondApproval = mutation({
  args: {
    tool: v.string(),
    decision: v.union(
      v.literal('once'),
      v.literal('always'),
      v.literal('deny'),
    ),
  },
  handler: async (ctx, args): Promise<{ approved: boolean }> => {
    const { userId } = await requireUser(ctx)
    if (args.decision === 'deny') {
      await ctx.runMutation(internal.aiChat.logEvent, {
        userId,
        type: 'approval_denied',
        level: 'warning',
        message: "Action IA refusee par l'utilisateur",
        tool: args.tool,
      })
      return { approved: false }
    }

    if (args.decision === 'always') {
      const doc = await ctx.db
        .query('aiPermissionPrefs')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique()
      if (!doc) {
        await ctx.db.insert('aiPermissionPrefs', {
          userId,
          mode: 'ask',
          alwaysAllow: [args.tool],
          updatedAt: Date.now(),
        })
      } else if (!doc.alwaysAllow.includes(args.tool)) {
        await ctx.db.patch(doc._id, {
          alwaysAllow: [...doc.alwaysAllow, args.tool],
          updatedAt: Date.now(),
        })
      }
    }

    await ctx.runMutation(internal.aiChat.logEvent, {
      userId,
      type: 'approval_granted',
      level: 'info',
      message:
        args.decision === 'always'
          ? 'Action IA autorisee de facon persistante'
          : 'Action IA autorisee une fois',
      tool: args.tool,
      metadata: JSON.stringify({ decision: args.decision }),
    })

    return { approved: true }
  },
})
