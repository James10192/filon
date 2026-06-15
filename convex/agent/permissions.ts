import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Lecture interne des préférences de permission du copilote, utilisée par les
 * outils d'écriture (`agent/tools/write.ts`) pour décider de l'exécution auto vs
 * la demande d'approbation. Valeur par défaut sûre : mode `ask`, aucun outil
 * pré-autorisé. `internalQuery` = non exposé au client.
 */
export const getPrefs = internalQuery({
  args: { userId: v.string() },
  handler: async (
    ctx,
    { userId },
  ): Promise<{ mode: 'ask' | 'accept' | 'auto' | 'bypass'; alwaysAllow: string[] }> => {
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
