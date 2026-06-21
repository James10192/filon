import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'
import { flagPriorityFor, unflagPriorityFor } from '../lib/flagPriority'

/**
 * Écritures gouvernées du copilote (couche premium), scopées par `userId`. Elles
 * délèguent aux helpers métier qui imposent déjà rôle + org côté serveur :
 *  - `flagPriority`/`unflagPriority` → `lib/flagPriority` (manager de l'équipe) ;
 *  - `setRankGoal` → upsert de l'objectif de palier (settings du user).
 * `internalMutation` = jamais exposé au client ; seul l'outil du copilote les
 * déclenche, après le flux d'approbation (`canRun`).
 */

/** Pointe une opportunité d'un équipier comme prioritaire (manager only). */
export const flagPriority = internalMutation({
  args: {
    userId: v.string(),
    opportunityId: v.id('opportunities'),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { userId, opportunityId, note }) =>
    flagPriorityFor(ctx, userId, opportunityId, note),
})

/** Retire le pointage de priorité (manager de l'équipe ou propriétaire). */
export const unflagPriority = internalMutation({
  args: { userId: v.string(), opportunityId: v.id('opportunities') },
  handler: async (ctx, { userId, opportunityId }) =>
    unflagPriorityFor(ctx, userId, opportunityId),
})

/** Définit (ou efface) l'objectif de palier réseau du user. Upsert settings. */
export const setRankGoal = internalMutation({
  args: {
    userId: v.string(),
    label: v.optional(v.string()),
    targetActives: v.optional(v.number()),
  },
  handler: async (ctx, { userId, label, targetActives }) => {
    const now = Date.now()
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const cleanLabel = label?.trim() ? label.trim() : undefined
    const cleanTarget =
      typeof targetActives === 'number' && targetActives > 0
        ? Math.floor(targetActives)
        : undefined

    if (existing) {
      await ctx.db.patch(existing._id, {
        rankGoalLabel: cleanLabel,
        rankGoalTargetActives: cleanTarget,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert('settings', {
        userId,
        rankGoalLabel: cleanLabel,
        rankGoalTargetActives: cleanTarget,
        createdAt: now,
        updatedAt: now,
      })
    }
    return { goalLabel: cleanLabel ?? null, target: cleanTarget ?? null }
  },
})
