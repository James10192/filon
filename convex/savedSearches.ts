import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { currentPlan, requireUser } from './lib/withUser'
import { limitsFor, planLimitError } from './lib/plan'

/**
 * Domaine savedSearches · mots-clés surveillés par le moniteur educarriere.
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser` et scope via
 * l'index `by_user`. Jamais `undefined` dans l'insert/patch.
 */

/** Normalise une liste de mots-clés : trim, lowercase, sans vides, dédupliqués. */
function normalizeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of keywords) {
    const kw = raw.trim().toLowerCase()
    if (kw.length === 0 || seen.has(kw)) continue
    seen.add(kw)
    out.push(kw)
  }
  return out
}

/** Recherches enregistrées du user courant, triées par date de création. */
export const list = query({
  args: {},
  handler: async (ctx): Promise<Doc<'savedSearches'>[]> => {
    const { userId } = await requireUser(ctx)
    const rows = await ctx.db
      .query('savedSearches')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    return rows.sort((a, b) => a.createdAt - b.createdAt)
  },
})

/** Crée une recherche enregistrée (mots-clés normalisés). */
export const create = mutation({
  args: {
    keywords: v.array(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    // Gating freemium : nombre de recherches enregistrées plafonné. On compte
    // les recherches existantes du user et on refuse au-delà de la limite.
    const limit = limitsFor(await currentPlan(ctx, userId)).savedSearches
    if (limit !== null) {
      const existing = await ctx.db
        .query('savedSearches')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
      if (existing.length >= limit) {
        throw planLimitError(
          `Le palier Découverte autorise ${limit} recherche de veille. Passez à Pro pour surveiller plusieurs recherches.`,
        )
      }
    }

    const now = Date.now()
    return ctx.db.insert('savedSearches', {
      userId,
      keywords: normalizeKeywords(args.keywords),
      enabled: args.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/** Met à jour les mots-clés et/ou l'état actif. Patch dynamique. */
export const update = mutation({
  args: {
    id: v.id('savedSearches'),
    keywords: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await ctx.db.get(args.id)
    if (!doc) throw new Error('Introuvable')
    if (doc.userId !== userId) throw new Error('Non autorisé')

    const patch: {
      updatedAt: number
      keywords?: string[]
      enabled?: boolean
    } = { updatedAt: Date.now() }
    if (args.keywords !== undefined) {
      patch.keywords = normalizeKeywords(args.keywords)
    }
    if (args.enabled !== undefined) patch.enabled = args.enabled

    await ctx.db.patch(args.id, patch)
    return null
  },
})

/** Supprime une recherche enregistrée (après vérification de propriété). */
export const remove = mutation({
  args: { id: v.id('savedSearches') },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await ctx.db.get(args.id)
    if (!doc) throw new Error('Introuvable')
    if (doc.userId !== userId) throw new Error('Non autorisé')

    await ctx.db.delete(args.id)
    return null
  },
})
