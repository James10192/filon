import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { currentPlan, requireUser } from './lib/withUser'
import {
  forbiddenError,
  limitsFor,
  notFoundError,
  planLimitError,
} from './lib/plan'
import { isConnectorId } from './veille/connectors'

const intentValidator = v.union(
  v.literal('apply'),
  v.literal('prospect'),
  v.literal('both'),
)

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

/** Filtre une liste de sources sur les connecteurs auto connus. */
function normalizeSources(sources: string[]): string[] {
  return Array.from(new Set(sources.filter(isConnectorId)))
}

/** Crée une veille enrichie (mots-clés normalisés, champs optionnels). */
export const create = mutation({
  args: {
    keywords: v.array(v.string()),
    enabled: v.optional(v.boolean()),
    name: v.optional(v.string()),
    intent: v.optional(intentValidator),
    excludeKeywords: v.optional(v.array(v.string())),
    sources: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
    notify: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    // Gating freemium : nombre de veilles plafonné. On compte les veilles
    // existantes du user et on refuse au-delà de la limite.
    const limit = limitsFor(await currentPlan(ctx, userId)).savedSearches
    if (limit !== null) {
      const existing = await ctx.db
        .query('savedSearches')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
      if (existing.length >= limit) {
        throw planLimitError(
          `Le palier Découverte autorise ${limit} veille. Passez à Pro pour en surveiller plusieurs, automatiquement.`,
        )
      }
    }

    const now = Date.now()
    // Construit l'objet dynamiquement : jamais de `undefined` dans un insert Convex.
    const doc: Record<string, unknown> = {
      userId,
      keywords: normalizeKeywords(args.keywords),
      enabled: args.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }
    if (args.name?.trim()) doc.name = args.name.trim()
    if (args.intent) doc.intent = args.intent
    if (args.excludeKeywords) {
      doc.excludeKeywords = normalizeKeywords(args.excludeKeywords)
    }
    if (args.sources && args.sources.length > 0) {
      doc.sources = normalizeSources(args.sources)
    }
    if (args.location?.trim()) doc.location = args.location.trim()
    if (args.notify !== undefined) doc.notify = args.notify

    return ctx.db.insert(
      'savedSearches',
      doc as Omit<Doc<'savedSearches'>, '_id' | '_creationTime'>,
    )
  },
})

/** Met à jour une veille (champs fournis seulement). Patch dynamique. */
export const update = mutation({
  args: {
    id: v.id('savedSearches'),
    keywords: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
    name: v.optional(v.string()),
    intent: v.optional(intentValidator),
    excludeKeywords: v.optional(v.array(v.string())),
    sources: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
    notify: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await ctx.db.get(args.id)
    if (!doc) throw notFoundError('Introuvable')
    if (doc.userId !== userId) throw forbiddenError('Non autorisé')

    const patch: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.keywords !== undefined) {
      patch.keywords = normalizeKeywords(args.keywords)
    }
    if (args.enabled !== undefined) patch.enabled = args.enabled
    if (args.name !== undefined) patch.name = args.name.trim()
    if (args.intent !== undefined) patch.intent = args.intent
    if (args.excludeKeywords !== undefined) {
      patch.excludeKeywords = normalizeKeywords(args.excludeKeywords)
    }
    if (args.sources !== undefined) patch.sources = normalizeSources(args.sources)
    if (args.location !== undefined) patch.location = args.location.trim()
    if (args.notify !== undefined) patch.notify = args.notify

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
    if (!doc) throw notFoundError('Introuvable')
    if (doc.userId !== userId) throw forbiddenError('Non autorisé')

    await ctx.db.delete(args.id)
    return null
  },
})
