import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/withUser'

/**
 * Domaine : preferences utilisateur (`api.settings.*`).
 *
 * Une seule ligne `settings` par user. Multi-tenant strict : chaque fonction
 * commence par `requireUser(ctx)` et scope via l'index `by_user`. Toute ecriture
 * force `userId` a la valeur du user courant (jamais depuis les args du client).
 *
 * Champs metier :
 * - `currency` : devise par defaut d'affichage du CA (defaut `XOF`).
 * - `pipelineStages` : libelles personnalises des etapes du pipeline (optionnel,
 *   sinon les defauts du produit s'appliquent cote front).
 */

/** Forme retournee quand aucune ligne n'existe encore (ne throw pas). */
const DEFAULT_SETTINGS = {
  pipelineStages: undefined as string[] | undefined,
  currency: 'XOF',
}

/**
 * Preferences du user courant. Retourne un objet par defaut si la ligne n'a
 * pas encore ete creee (ne throw pas), pour que la page Parametres puisse
 * toujours afficher des valeurs.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)

    const settings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    if (!settings) {
      return DEFAULT_SETTINGS
    }
    return settings
  },
})

/**
 * Cree la ligne de preferences si elle est absente, sinon la met a jour.
 * Patch + `updatedAt`. Jamais `undefined` dans l'insert/patch : on ne pose que
 * les champs reellement fournis.
 */
export const upsert = mutation({
  args: {
    pipelineStages: v.optional(v.array(v.string())),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const now = Date.now()

    const existing = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    if (existing) {
      const patch: {
        updatedAt: number
        pipelineStages?: string[]
        currency?: string
      } = { updatedAt: now }
      if (args.pipelineStages !== undefined) {
        patch.pipelineStages = args.pipelineStages
      }
      if (args.currency !== undefined) patch.currency = args.currency
      await ctx.db.patch(existing._id, patch)
      return null
    }

    const doc: {
      userId: string
      createdAt: number
      updatedAt: number
      pipelineStages?: string[]
      currency?: string
    } = { userId, createdAt: now, updatedAt: now }
    if (args.pipelineStages !== undefined) doc.pipelineStages = args.pipelineStages
    if (args.currency !== undefined) doc.currency = args.currency

    await ctx.db.insert('settings', doc)
    return null
  },
})
