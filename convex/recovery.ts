import { v } from 'convex/values'
import { mutation } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireUser, type MutationCtx } from './lib/withUser'
import { forbiddenError, notFoundError, validationError } from './lib/plan'

const DEFAULT_DELAY_DAYS = 3
const FOLLOWUP_LABEL = 'Verifier si le paiement a ete recu'

async function ownedOpportunity(
  ctx: MutationCtx,
  userId: string,
  id: Id<'opportunities'>,
): Promise<Doc<'opportunities'>> {
  const opportunity = await ctx.db.get(id)
  if (!opportunity) throw notFoundError('Introuvable')
  if (opportunity.userId !== userId) throw forbiddenError('Non autorise')
  return opportunity
}

async function recoveryDelayDays(
  ctx: MutationCtx,
  userId: string,
): Promise<number> {
  const settings = await ctx.db
    .query('settings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  const value = settings?.recoveryReminderDelayDays ?? DEFAULT_DELAY_DAYS
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DELAY_DAYS
}

function dueDateForDelay(delayDays: number): string {
  const due = new Date()
  due.setDate(due.getDate() + delayDays)
  return due.toISOString()
}

export const markPrompted = mutation({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const opportunity = await ownedOpportunity(ctx, userId, args.opportunityId)
    if (opportunity.stage !== 'won') {
      throw validationError('Le recouvrement concerne une opportunite gagnee')
    }
    if (opportunity.recoveryStatus !== undefined) return null

    await ctx.db.patch(args.opportunityId, {
      recoveryStatus: 'prompted',
      recoveryPromptedAt: Date.now(),
      updatedAt: Date.now(),
    })
    return null
  },
})

export const createManualFollowup = mutation({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const opportunity = await ownedOpportunity(ctx, userId, args.opportunityId)
    if (opportunity.stage !== 'won') {
      throw validationError('Le recouvrement concerne une opportunite gagnee')
    }
    if (opportunity.recoveryFollowupId) return opportunity.recoveryFollowupId

    const now = Date.now()
    const followupId = await ctx.db.insert('followups', {
      userId,
      opportunityId: args.opportunityId,
      label: FOLLOWUP_LABEL,
      dueDate: dueDateForDelay(await recoveryDelayDays(ctx, userId)),
      done: false,
      createdAt: now,
    })

    await ctx.db.patch(args.opportunityId, {
      recoveryStatus: 'manual_followup',
      recoveryPromptedAt: opportunity.recoveryPromptedAt ?? now,
      recoveryFollowupId: followupId,
      updatedAt: now,
    })
    return followupId
  },
})

export const markMailpulsePending = mutation({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const opportunity = await ownedOpportunity(ctx, userId, args.opportunityId)
    if (opportunity.stage !== 'won') {
      throw validationError('Le recouvrement concerne une opportunite gagnee')
    }
    const now = Date.now()
    await ctx.db.patch(args.opportunityId, {
      recoveryStatus: 'mailpulse_pending',
      recoveryPromptedAt: opportunity.recoveryPromptedAt ?? now,
      mailpulseLastSyncAt: now,
      updatedAt: now,
    })
    return null
  },
})
