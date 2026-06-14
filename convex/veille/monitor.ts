import { v } from 'convex/values'
import { internalMutation, internalQuery } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { limitsFor, planOf } from '../lib/plan'

/**
 * Veille · opérations de données côté cron.
 *
 * Ces fonctions sont `internal*` : non appelables par le client, donc pas de
 * `requireUser`. Elles reçoivent un `userId` explicite (le moniteur itère les
 * recherches enregistrées de tous les users). Elles ne peuvent pas appeler la
 * mutation gatée `opportunities.create` : la logique d'ordre/activité est
 * répliquée ici (4 lignes), par conception.
 */

type SavedSearch = Pick<Doc<'savedSearches'>, '_id' | 'userId' | 'keywords'>

/**
 * Recherches actives des users éligibles à la veille AUTOMATIQUE (palier
 * pro / pro_ai). Le moniteur (cron) SAUTE les recherches des users gratuits :
 * sur le palier Découverte, la veille reste manuelle (import à la demande).
 * On résout le palier de chaque user via `by_authId` (cache local par userId
 * pour ne pas relire la même ligne `users`).
 */
export const enabledSearches = internalQuery({
  args: {},
  handler: async (ctx): Promise<SavedSearch[]> => {
    const rows = await ctx.db
      .query('savedSearches')
      .withIndex('by_enabled', (q) => q.eq('enabled', true))
      .collect()

    const autoByUser = new Map<string, boolean>()
    const out: SavedSearch[] = []
    for (const r of rows) {
      let auto = autoByUser.get(r.userId)
      if (auto === undefined) {
        const userDoc = await ctx.db
          .query('users')
          .withIndex('by_authId', (q) => q.eq('authId', r.userId))
          .unique()
        auto = limitsFor(planOf(userDoc?.plan ?? null)).veilleAutoMonitor
        autoByUser.set(r.userId, auto)
      }
      if (!auto) continue
      out.push({ _id: r._id, userId: r.userId, keywords: r.keywords })
    }
    return out
  },
})

/** Position suivante (max + 1) dans la colonne `lead` du user. */
async function nextLeadOrder(
  ctx: { db: { query: (t: 'opportunities') => unknown } },
  userId: string,
): Promise<number> {
  // Typage assoupli localement pour rester découplé de opportunities.ts.
  const db = (ctx as unknown as { db: { query: (t: string) => any } }).db
  const inStage: Doc<'opportunities'>[] = await db
    .query('opportunities')
    .withIndex('by_user_stage', (q: any) =>
      q.eq('userId', userId).eq('stage', 'lead'),
    )
    .collect()
  return inStage.reduce((max, o) => Math.max(max, o.order), -1) + 1
}

/**
 * Importe une offre détectée par le moniteur dans le pipeline du user.
 * Déduplique via l'index `by_user_sourceUrl` (idempotent sur ré-exécutions).
 * Retourne `true` si créée, `false` si déjà présente.
 */
export const importFromMonitor = internalMutation({
  args: {
    userId: v.string(),
    title: v.string(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const { userId, title, sourceUrl } = args

    // Déduplication : (userId, sourceUrl) déjà présent → on n'insère pas.
    const existing = await ctx.db
      .query('opportunities')
      .withIndex('by_user_sourceUrl', (q) =>
        q.eq('userId', userId).eq('sourceUrl', sourceUrl),
      )
      .first()
    if (existing) return false

    const now = Date.now()
    const order = await nextLeadOrder(ctx, userId)

    const opportunityId: Id<'opportunities'> = await ctx.db.insert(
      'opportunities',
      {
        userId,
        title,
        type: 'job_offer',
        stage: 'lead',
        priority: 'medium',
        tags: ['veille', 'educarriere'],
        order,
        importSource: 'educarriere',
        sourceUrl,
        importedAt: now,
        source: 'educarriere',
        url: sourceUrl,
        createdAt: now,
        updatedAt: now,
      },
    )

    // Journalise l'import dans la timeline (même transaction).
    await ctx.db.insert('activities', {
      userId,
      opportunityId,
      kind: 'other',
      content: `Offre importée via la veille educarriere : ${title}`,
      createdAt: now,
    })

    return true
  },
})

/** Met à jour les métadonnées d'exécution d'une recherche enregistrée. */
export const markRun = internalMutation({
  args: {
    searchId: v.id('savedSearches'),
    count: v.number(),
  },
  handler: async (ctx, args): Promise<null> => {
    const now = Date.now()
    await ctx.db.patch(args.searchId, {
      lastRunAt: now,
      lastMatchCount: args.count,
      updatedAt: now,
    })
    return null
  },
})
