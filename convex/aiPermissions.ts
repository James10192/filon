import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/withUser'

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
    const doc = await ctx.db
      .query('aiPermissionPrefs')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    return {
      mode: doc?.mode ?? 'ask',
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
