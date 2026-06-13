import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { AnyCtx } from './lib/withUser'
import { requireUser } from './lib/withUser'

/**
 * Domaine activities · timeline d'une opportunité.
 *
 * Multi-tenant strict : scope `userId` via index `by_user*`, vérification de
 * propriété de l'opportunité parente avant toute lecture/écriture.
 */

const kindValidator = v.union(
  v.literal('note'),
  v.literal('email'),
  v.literal('call'),
  v.literal('interview'),
  v.literal('status_change'),
  v.literal('other'),
)

/** Vérifie que l'opportunité existe et appartient au user courant. */
async function assertOwnsOpportunity(
  ctx: AnyCtx,
  userId: string,
  opportunityId: Id<'opportunities'>,
): Promise<void> {
  const opportunity = await ctx.db.get(opportunityId)
  if (!opportunity) throw new Error('Introuvable')
  if (opportunity.userId !== userId) throw new Error('Non autorisé')
}

export const listByOpportunity = query({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await assertOwnsOpportunity(ctx, userId, args.opportunityId)

    const rows = await ctx.db
      .query('activities')
      .withIndex('by_user_opportunity', (q) =>
        q.eq('userId', userId).eq('opportunityId', args.opportunityId),
      )
      .collect()

    return rows.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const limit = args.limit ?? 20

    const rows = await ctx.db
      .query('activities')
      .withIndex('by_user_created', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit)

    // Résolution des titres d'opportunités (cache local pour éviter les doublons).
    const titleCache = new Map<Id<'opportunities'>, string>()
    const enriched: Array<Doc<'activities'> & { opportunityTitle: string }> = []
    for (const row of rows) {
      const cached = titleCache.get(row.opportunityId)
      let title: string
      if (cached !== undefined) {
        title = cached
      } else {
        const opportunity = await ctx.db.get(row.opportunityId)
        title =
          opportunity && opportunity.userId === userId
            ? opportunity.title
            : 'Opportunité supprimée'
        titleCache.set(row.opportunityId, title)
      }
      enriched.push({ ...row, opportunityTitle: title })
    }
    return enriched
  },
})

export const add = mutation({
  args: {
    opportunityId: v.id('opportunities'),
    kind: kindValidator,
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await assertOwnsOpportunity(ctx, userId, args.opportunityId)

    return ctx.db.insert('activities', {
      userId,
      opportunityId: args.opportunityId,
      kind: args.kind,
      content: args.content,
      createdAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id('activities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const doc = await ctx.db.get(args.id)
    if (!doc) throw new Error('Introuvable')
    if (doc.userId !== userId) throw new Error('Non autorisé')
    await ctx.db.delete(args.id)
    return null
  },
})
