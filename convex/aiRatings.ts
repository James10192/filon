import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { internal } from './_generated/api'
import { requireUser } from './lib/withUser'
import { forbiddenError } from './lib/plan'

const ratingValidator = v.union(v.literal('up'), v.literal('down'))

export const rateResponse = mutation({
  args: {
    threadId: v.string(),
    messageKey: v.string(),
    rating: ratingValidator,
    comment: v.optional(v.string()),
    escalateToSupport: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const thread = await ctx.db
      .query('aiThreads')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .unique()
    if (!thread || thread.userId !== userId) {
      throw forbiddenError('Conversation introuvable.')
    }
    const assistantKind = thread.assistantKind ?? 'pipeline'

    const comment = args.comment?.trim()
    const existing = await ctx.db
      .query('aiResponseRatings')
      .withIndex('by_thread_message', (q) =>
        q.eq('threadId', args.threadId).eq('messageKey', args.messageKey),
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        rating: args.rating,
        ...(comment ? { comment } : {}),
        ...(args.escalateToSupport !== undefined
          ? { escalatedToSupport: args.escalateToSupport }
          : {}),
      })
    } else {
      await ctx.db.insert('aiResponseRatings', {
        userId,
        threadId: args.threadId,
        assistantKind,
        messageKey: args.messageKey,
        rating: args.rating,
        ...(comment ? { comment } : {}),
        ...(args.escalateToSupport !== undefined
          ? { escalatedToSupport: args.escalateToSupport }
          : {}),
        createdAt: Date.now(),
      })
    }

    if (args.rating === 'down') {
      await ctx.runMutation(internal.aiChat.logEvent, {
        userId,
        threadId: args.threadId,
        assistantKind,
        type: 'response_rated_down',
        level: 'warning',
        message: 'Réponse IA mal notée',
        metadata: JSON.stringify({
          messageKey: args.messageKey,
          comment,
          escalateToSupport: Boolean(args.escalateToSupport),
        }),
      })
    }

    return { ok: true as const }
  },
})
