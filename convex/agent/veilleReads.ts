import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Lecture interne du copilote pour la couche VEILLE. Scopée `userId`. Renvoie les
 * veilles enregistrées + les captures récentes (opportunités tag `veille`) avec
 * leur stade et l'entonnoir. PAS d'import de capture (hors périmètre v1) : lecture
 * seule.
 */
export const veilleDigest = internalQuery({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const searches = await ctx.db
      .query('savedSearches')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const opps = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const captures = opps.filter((o) => o.tags.includes('veille'))

    const funnel = { captured: captures.length, active: 0, won: 0, lost: 0 }
    for (const o of captures) {
      if (o.stage === 'won') funnel.won += 1
      else if (o.stage === 'lost') funnel.lost += 1
      else funnel.active += 1
    }

    const recent = captures
      .sort(
        (a, b) => (b.importedAt ?? b.createdAt) - (a.importedAt ?? a.createdAt),
      )
      .slice(0, limit ?? 8)
      .map((o) => ({
        id: o._id,
        title: o.title,
        stage: o.stage,
        source: o.source ?? null,
      }))

    return {
      searches: searches
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((s) => ({
          id: s._id,
          name: s.name ?? null,
          keywords: s.keywords,
          enabled: s.enabled,
          lastMatchCount: s.lastMatchCount ?? null,
        })),
      funnel,
      recent,
    }
  },
})
