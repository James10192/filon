import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { currentPlan, requireUser } from './lib/withUser'
import {
  effectivePermMode,
  forbiddenError,
  permModeAllowed,
} from './lib/plan'

/**
 * Domaine aiPermissions · préférences d'autonomie du copilote (1 ligne / user).
 *
 * `mode` pilote le comportement des outils d'écriture :
 *  - `ask`    : chaque écriture demande une approbation (sauf outils dans
 *               `alwaysAllow`).
 *  - `accept` : écritures acceptées par défaut.
 *  - `auto`   : exécution autonome.
 *  - `bypass` : exécution autonome, sans confirmation.
 * `alwaysAllow` mémorise les outils explicitement autorisés « toujours ».
 */

const modeValidator = v.union(
  v.literal('ask'),
  v.literal('accept'),
  v.literal('auto'),
  v.literal('bypass'),
)

export const get = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    mode: 'ask' | 'accept' | 'auto' | 'bypass'
    alwaysAllow: string[]
  }> => {
    const { userId } = await requireUser(ctx)
    const [doc, plan] = await Promise.all([
      ctx.db
        .query('aiPermissionPrefs')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique(),
      currentPlan(ctx, userId),
    ])
    // Reflète le mode EFFECTIF (un mode autonome stocké mais non autorisé par le
    // palier courant est ramené à « ask ») : le déclencheur UI ne ment jamais.
    return {
      mode: effectivePermMode(plan, doc?.mode ?? 'ask'),
      alwaysAllow: doc?.alwaysAllow ?? [],
    }
  },
})

export const set = mutation({
  args: {
    mode: v.optional(modeValidator),
    alwaysAllow: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)

    // Gate serveur : les modes autonomes (Auto / Bypass) sont réservés au palier
    // Copilot Max. Verrouiller ici empêche un appel direct à la mutation de
    // contourner le verrou de l'UI.
    if (args.mode !== undefined) {
      const plan = await currentPlan(ctx, userId)
      if (!permModeAllowed(plan, args.mode)) {
        throw forbiddenError(
          'Les modes Auto et Bypass nécessitent le palier Copilot Max.',
        )
      }
    }

    const doc = await ctx.db
      .query('aiPermissionPrefs')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    if (!doc) {
      await ctx.db.insert('aiPermissionPrefs', {
        userId,
        mode: args.mode ?? 'ask',
        alwaysAllow: args.alwaysAllow ?? [],
        updatedAt: Date.now(),
      })
      return null
    }

    const patch: {
      updatedAt: number
      mode?: 'ask' | 'accept' | 'auto' | 'bypass'
      alwaysAllow?: string[]
    } = { updatedAt: Date.now() }
    if (args.mode !== undefined) patch.mode = args.mode
    if (args.alwaysAllow !== undefined) patch.alwaysAllow = args.alwaysAllow
    await ctx.db.patch(doc._id, patch)
    return null
  },
})
