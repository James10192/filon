import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
  type MutationCtx,
} from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { requireUser } from '../lib/withUser'
import { planOf } from '../lib/plan'
import { readCreditState, type AiBudget } from '../lib/aiGate'

/** Requête unique de l'analyse IA d'une opportunité (factorisée, 4 appelants). */
async function signalByOpportunity(
  ctx: QueryCtx | MutationCtx,
  opportunityId: Id<'opportunities'>,
): Promise<Doc<'aiSignals'> | null> {
  return ctx.db
    .query('aiSignals')
    .withIndex('by_opportunity', (q) => q.eq('opportunityId', opportunityId))
    .unique()
}

/**
 * Veille IA · accès données (queries/mutations) de la couche d'analyse de signaux.
 * L'appel LLM lui-même vit dans `ai.ts` (action). Ici : gate crédits, lecture de
 * l'opportunité, cache des analyses (`aiSignals`).
 */

const actionValidator = v.union(
  v.literal('apply'),
  v.literal('prospect'),
  v.literal('ignore'),
)

/**
 * Gate IA « à l'acte » (scoring/brouillon) : crédit-based, ouvert à TOUS les
 * paliers (dégustation free=25 … copilot=6000), à la différence du copilote
 * agentique (copilot-only). Retourne de quoi appliquer le fair-use côté action.
 */
export const aiSignalGate = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<AiBudget> => {
    const userDoc = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', userId))
      .unique()
    return readCreditState(ctx, userId, planOf(userDoc?.plan ?? null))
  },
})

export type OpportunityForAi = {
  title: string
  description: string | null
  type: string
  tags: string[]
  location: string | null
  source: string | null
  companyName: string | null
}

/** Charge une opportunité pour analyse IA (après vérification de propriété). */
export const loadOpportunityForAi = internalQuery({
  args: { userId: v.string(), opportunityId: v.id('opportunities') },
  handler: async (ctx, args): Promise<OpportunityForAi | null> => {
    const o = await ctx.db.get(args.opportunityId)
    if (!o || o.userId !== args.userId) return null
    let companyName: string | null = null
    if (o.companyId) {
      const c = await ctx.db.get(o.companyId)
      companyName = c?.name ?? null
    }
    return {
      title: o.title,
      description: o.description ?? null,
      type: o.type,
      tags: o.tags,
      location: o.location ?? null,
      source: o.source ?? null,
      companyName,
    }
  },
})

/** Analyse en cache (lecture interne pour l'action). */
export const getSignalInternal = internalQuery({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, { opportunityId }): Promise<Doc<'aiSignals'> | null> => {
    return signalByOpportunity(ctx, opportunityId)
  },
})

/** `api.veille.aiData.signalFor` : analyse IA d'une opportunité (lecture UI). */
export const signalFor = query({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, { opportunityId }): Promise<Doc<'aiSignals'> | null> => {
    const { userId } = await requireUser(ctx)
    const sig = await signalByOpportunity(ctx, opportunityId)
    if (!sig || sig.userId !== userId) return null
    return sig
  },
})

/** Upsert d'une analyse (score + action + justification). */
export const saveSignal = internalMutation({
  args: {
    userId: v.string(),
    opportunityId: v.id('opportunities'),
    score: v.number(),
    suggestedAction: actionValidator,
    rationale: v.string(),
  },
  handler: async (ctx, args): Promise<Id<'aiSignals'>> => {
    const now = Date.now()
    const existing = await signalByOpportunity(ctx, args.opportunityId)
    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
        suggestedAction: args.suggestedAction,
        rationale: args.rationale,
        updatedAt: now,
      })
      return existing._id
    }
    return ctx.db.insert('aiSignals', {
      userId: args.userId,
      opportunityId: args.opportunityId,
      score: args.score,
      suggestedAction: args.suggestedAction,
      rationale: args.rationale,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/** Mémorise le brouillon généré pour une analyse existante. */
export const saveDraft = internalMutation({
  args: { opportunityId: v.id('opportunities'), draft: v.string() },
  handler: async (ctx, { opportunityId, draft }): Promise<null> => {
    const sig = await signalByOpportunity(ctx, opportunityId)
    if (sig) await ctx.db.patch(sig._id, { draft, updatedAt: Date.now() })
    return null
  },
})
