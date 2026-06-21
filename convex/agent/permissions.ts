import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'
import { currentPlan } from '../lib/withUser'
import { effectivePermMode } from '../lib/plan'

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
    const [doc, plan] = await Promise.all([
      ctx.db
        .query('aiPermissionPrefs')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique(),
      currentPlan(ctx, userId),
    ])
    // Défense en profondeur : un mode autonome stocké du temps où le user était
    // Copilot Max, puis rétrogradé (la ligne de prefs n'est PAS réécrite), est
    // ramené au repli sûr avant d'être consommé par les outils d'écriture.
    return {
      mode: effectivePermMode(plan, doc?.mode ?? 'ask'),
      alwaysAllow: doc?.alwaysAllow ?? [],
    }
  },
})
