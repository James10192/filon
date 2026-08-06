import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireUser } from '../lib/withUser'
import { requireOwnedDeal } from './deals'

export const closeDeal = mutation({
  args: { opportunityId: v.id('opportunities'), outcome: v.union(v.literal('won'), v.literal('lost')), closedAt: v.number(), summary: v.string(), valueAmount: v.optional(v.number()), valueCurrency: v.optional(v.string()), lossReason: v.optional(v.string()), nextAction: v.object({ label: v.string(), dueAt: v.optional(v.number()) }) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const deal = await requireOwnedDeal(ctx, userId, args.opportunityId)
    if (!args.summary.trim()) throw new Error('Un resume de cloture est requis.')
    if (args.outcome === 'won' && args.valueAmount === undefined) throw new Error('La valeur du deal gagne est requise.')
    if (args.outcome === 'lost' && !args.lossReason?.trim()) throw new Error('La raison de perte est requise.')
    const now = Date.now()
    await ctx.db.patch(deal._id, { stage: args.outcome, dealStatus: args.outcome, closedAt: args.closedAt, closingSummary: args.summary, ...(args.valueAmount !== undefined ? { valueAmount: args.valueAmount } : {}), ...(args.valueCurrency ? { valueCurrency: args.valueCurrency } : {}), ...(args.lossReason ? { lossReason: args.lossReason } : {}), updatedAt: now })
    await ctx.db.insert('dealTransitions', { userId, opportunityId: deal._id, fromStage: deal.stage, toStage: args.outcome, reason: args.summary, createdAt: now })
    await ctx.db.insert('dealMilestones', { userId, opportunityId: deal._id, kind: 'closed', label: args.outcome === 'won' ? 'Deal gagne' : 'Deal perdu', occurredAt: args.closedAt, createdAt: now })
    await ctx.db.insert('lifecycleEvents', { userId, opportunityId: deal._id, event: args.outcome === 'won' ? 'deal_won' : 'deal_lost', source: 'user', metadata: args.summary, createdAt: now })
    await ctx.db.insert('actionItems', { userId, opportunityId: deal._id, label: args.nextAction.label, status: 'open', ...(args.nextAction.dueAt !== undefined ? { dueAt: args.nextAction.dueAt } : {}), createdAt: now })
    return null
  },
})
