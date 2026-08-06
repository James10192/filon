import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { requireUser, type MutationCtx } from '../lib/withUser'
import {
  requireOwnedNeed,
  requireOwnedOpportunity,
  requireOwnedRelationship,
} from './ownership'

export const dealStageValidator = v.union(v.literal('lead'), v.literal('contacted'), v.literal('applied'), v.literal('interview'), v.literal('negotiation'), v.literal('won'), v.literal('lost'))
const typeValidator = v.union(v.literal('job_offer'), v.literal('spontaneous'), v.literal('prospect'), v.literal('mission'))

export async function requireOwnedDeal(ctx: MutationCtx, userId: string, id: Id<'opportunities'>): Promise<Doc<'opportunities'>> {
  return requireOwnedOpportunity(ctx, userId, id)
}

export const createDeal = mutation({
  args: { title: v.string(), type: typeValidator, relationshipId: v.optional(v.id('relationships')), needId: v.optional(v.id('needs')), valueAmount: v.optional(v.number()), valueCurrency: v.optional(v.string()), expectedCloseAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await Promise.all([
      args.relationshipId
        ? requireOwnedRelationship(ctx, userId, args.relationshipId)
        : null,
      args.needId ? requireOwnedNeed(ctx, userId, args.needId) : null,
    ])
    const now = Date.now()
    const id = await ctx.db.insert('opportunities', { userId, title: args.title, type: args.type, stage: 'lead', priority: 'medium', tags: [], order: now, dealStatus: 'open', visibility: 'private', ...(args.relationshipId ? { relationshipId: args.relationshipId } : {}), ...(args.needId ? { needId: args.needId } : {}), ...(args.valueAmount !== undefined ? { valueAmount: args.valueAmount } : {}), ...(args.valueCurrency ? { valueCurrency: args.valueCurrency } : {}), ...(args.expectedCloseAt !== undefined ? { expectedCloseAt: args.expectedCloseAt } : {}), createdAt: now, updatedAt: now })
    await ctx.db.insert('dealMilestones', { userId, opportunityId: id, kind: 'created', label: 'Deal cree', occurredAt: now, createdAt: now })
    await ctx.db.insert('lifecycleEvents', { userId, opportunityId: id, event: 'deal_created', source: 'user', createdAt: now })
    return id
  },
})

export const transitionDeal = mutation({
  args: { opportunityId: v.id('opportunities'), toStage: dealStageValidator, reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const deal = await requireOwnedDeal(ctx, userId, args.opportunityId)
    if (deal.stage === args.toStage) return null
    const now = Date.now()
    await ctx.db.patch(deal._id, { stage: args.toStage, updatedAt: now })
    await ctx.db.insert('dealTransitions', { userId, opportunityId: deal._id, fromStage: deal.stage, toStage: args.toStage, ...(args.reason ? { reason: args.reason } : {}), createdAt: now })
    await ctx.db.insert('dealMilestones', { userId, opportunityId: deal._id, kind: 'stage_changed', label: `Etape: ${args.toStage}`, occurredAt: now, createdAt: now })
    return null
  },
})

export const recordInteraction = mutation({
  args: { opportunityId: v.id('opportunities'), kind: v.union(v.literal('note'), v.literal('email'), v.literal('call'), v.literal('meeting')), content: v.string(), nextAction: v.optional(v.object({ label: v.string(), dueAt: v.optional(v.number()) })) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await requireOwnedDeal(ctx, userId, args.opportunityId)
    const now = Date.now()
    await ctx.db.insert('activities', { userId, opportunityId: args.opportunityId, kind: args.kind === 'meeting' ? 'interview' : args.kind, content: args.content, createdAt: now })
    if (args.nextAction) await ctx.db.insert('actionItems', { userId, opportunityId: args.opportunityId, label: args.nextAction.label, status: 'open', ...(args.nextAction.dueAt !== undefined ? { dueAt: args.nextAction.dueAt } : {}), createdAt: now })
    return null
  },
})
