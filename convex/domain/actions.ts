import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { requireUser } from '../lib/withUser'

type Opportunity = Doc<'opportunities'>

const ACTIVE = new Set(['lead', 'contacted', 'applied', 'interview', 'negotiation'])
const PROBABILITY: Record<string, number> = {
  lead: 8,
  contacted: 16,
  applied: 30,
  interview: 58,
  negotiation: 82,
  won: 100,
}

function day(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

function compensation(value?: string): number {
  const digits = value?.replace(/[^\d]/g, '') ?? ''
  return digits ? Number(digits) : 0
}

function scoreOpportunity(opportunity: Opportunity, today: string) {
  const age = Math.floor((Date.now() - opportunity.updatedAt) / 86_400_000)
  const due = opportunity.nextActionAt
  const dueScore = due && due < today ? 35 : due === today ? 28 : due ? 12 : 20
  const value = compensation(opportunity.compensation)
  const valueScore = value >= 1_000_000 ? 14 : value >= 300_000 ? 9 : value > 0 ? 5 : 0
  const probability = PROBABILITY[opportunity.stage] ?? 0
  const probabilityScore = Math.round(probability / 10)
  const commitmentScore = opportunity.nextActionAt ? 7 : 0
  const inactivityScore = age >= 21 ? 18 : age >= 10 ? 11 : age >= 5 ? 5 : 0
  const phaseScore = opportunity.stage === 'negotiation' ? 10 : opportunity.stage === 'interview' ? 7 : 3
  const needScore = opportunity.type === 'mission' ? 4 : opportunity.type === 'prospect' ? 2 : 0
  const churnScore = opportunity.stage === 'won' && age >= 45 ? 18 : 0
  const upsellScore = opportunity.stage === 'won' && age >= 14 ? 10 : 0
  const score = dueScore + valueScore + probabilityScore + commitmentScore + inactivityScore + phaseScore + needScore + churnScore + upsellScore
  const reasons = [
    due && due < today ? 'échéance dépassée' : due === today ? 'échéance aujourd’hui' : null,
    valueScore >= 9 ? 'valeur élevée' : null,
    probability >= 58 ? 'probabilité avancée' : null,
    commitmentScore ? 'engagement planifié' : null,
    inactivityScore ? `${age} jours sans activité` : null,
    phaseScore >= 7 ? `phase ${opportunity.stage}` : null,
    needScore ? 'besoin à qualifier' : null,
    churnScore ? 'risque de silence client' : null,
    upsellScore ? 'signal de développement client' : null,
  ].filter((reason): reason is string => Boolean(reason))
  return { score, reasons, probability, age }
}

function titleFor(opportunity: Opportunity) {
  if (opportunity.stage !== 'won') return `Faire avancer ${opportunity.title}`
  return `Suivre ${opportunity.title}`
}

export const today = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 30)
    const today = day()
    const [opportunities, followups] = await Promise.all([
      ctx.db.query('opportunities').withIndex('by_user', q => q.eq('userId', userId)).collect(),
      ctx.db.query('followups').withIndex('by_user_done', q => q.eq('userId', userId).eq('done', false)).collect(),
    ])
    const byOpportunity = new Map(opportunities.map(item => [item._id, item]))
    const followupItems = followups
      .filter(item => item.dueDate <= addDays(7))
      .map(item => {
        const opportunity = item.opportunityId ? byOpportunity.get(item.opportunityId) : undefined
        const base = opportunity ? scoreOpportunity(opportunity, today).score : 0
        const overdue = item.dueDate < today ? 38 : item.dueDate === today ? 30 : 12
        return {
          id: item._id,
          kind: 'followup' as const,
          title: item.label,
          dueDate: item.dueDate,
          opportunityId: item.opportunityId,
          opportunityTitle: opportunity?.title ?? null,
          score: Math.min(100, base + overdue),
          reasons: [item.dueDate < today ? 'relance en retard' : item.dueDate === today ? 'relance à faire aujourd’hui' : 'relance proche'],
        }
      })
    const opportunityItems = opportunities
      .filter(item => ACTIVE.has(item.stage) || item.stage === 'won')
      .map(item => ({ id: item._id, kind: 'opportunity' as const, title: titleFor(item), opportunityId: item._id, opportunityTitle: item.title, dueDate: item.nextActionAt ?? null, ...scoreOpportunity(item, today) }))
    const items = [...followupItems, ...opportunityItems]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
    return {
      date: today,
      items,
      counts: { overdue: followupItems.filter(item => item.dueDate < today).length, dueToday: followupItems.filter(item => item.dueDate === today).length, total: items.length },
    }
  },
})

async function ownedOpportunity(ctx: Parameters<typeof requireUser>[0], userId: string, opportunityId: Id<'opportunities'>) {
  const opportunity = await ctx.db.get(opportunityId)
  if (!opportunity || opportunity.userId !== userId) throw new Error('Opportunité introuvable')
  return opportunity
}

export const completeActionAndGenerateNext = mutation({
  args: { followupId: v.optional(v.id('followups')), opportunityId: v.id('opportunities'), nextLabel: v.string(), nextDueDate: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await ownedOpportunity(ctx, userId, args.opportunityId)
    if (args.followupId) {
      const followup = await ctx.db.get(args.followupId)
      if (!followup || followup.userId !== userId) throw new Error('Action introuvable')
      await ctx.db.patch(args.followupId, { done: true })
    }
    await ctx.db.insert('followups', {
      userId,
      opportunityId: args.opportunityId,
      label: args.nextLabel.trim(),
      dueDate: args.nextDueDate,
      done: false,
      createdAt: Date.now(),
    })
    await ctx.db.patch(args.opportunityId, { nextActionAt: args.nextDueDate, updatedAt: Date.now() })
  },
})

export const reportReason = mutation({
  args: { opportunityId: v.id('opportunities'), reason: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await ownedOpportunity(ctx, userId, args.opportunityId)
    await ctx.db.insert('followups', { userId, opportunityId: args.opportunityId, label: `Compte rendu: ${args.reason.trim()}`, dueDate: day(), done: true, createdAt: Date.now() })
  },
})

export const ignoreWithJustification = mutation({
  args: { followupId: v.id('followups'), justification: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const followup = await ctx.db.get(args.followupId)
    if (!followup || followup.userId !== userId) throw new Error('Action introuvable')
    await ctx.db.patch(args.followupId, { done: true, label: `${followup.label} [ignorée: ${args.justification.trim()}]` })
  },
})

export const delegate = mutation({
  args: { opportunityId: v.id('opportunities'), assignee: v.string(), dueDate: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await ownedOpportunity(ctx, userId, args.opportunityId)
    await ctx.db.insert('followups', { userId, opportunityId: args.opportunityId, label: `À déléguer à ${args.assignee.trim()}`, dueDate: args.dueDate, done: false, createdAt: Date.now() })
  },
})

export const copilotPreparation = query({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const opportunity = await ownedOpportunity(ctx, userId, args.opportunityId)
    const followups = await ctx.db.query('followups').withIndex('by_user_done', q => q.eq('userId', userId).eq('done', false)).collect()
    return {
      opportunity: { id: opportunity._id, title: opportunity.title, stage: opportunity.stage, type: opportunity.type, nextActionAt: opportunity.nextActionAt ?? null },
      upcomingActions: followups.filter(item => item.opportunityId === opportunity._id).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4).map(item => ({ label: item.label, dueDate: item.dueDate })),
      guardrail: 'Contexte opérationnel uniquement. Aucune note privée, information sensible ou action autonome n’est incluse.',
    }
  },
})





