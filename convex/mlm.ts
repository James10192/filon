import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { optionalUser, requireUser } from './lib/withUser'

/**
 * Wedge marketing relationnel : l'Objectif de palier.
 *
 * Principe (cf. memoire `filon-mlm-positioning`) : l'app de l'entreprise affiche
 * deja le rang et les revenus. Filon ne recopie AUCUN de ces chiffres. Il
 * transforme « combien j'ai gagne » (resolu ailleurs) en « combien et QUI il me
 * manque pour le palier suivant », DERIVE du pipeline et du reseau de l'utilisateur :
 *  - actifs = filleuls `mlmStatus: 'active'` (le reseau acquis) ;
 *  - liste focus = opportunites en `interview`/`negotiation` (les prochains actifs
 *    a aller chercher). C'est le game plan que le dashboard de l'entreprise ne donne pas.
 */

/** Progression vers le palier cible, derivee du pipeline (jamais de l'entreprise). */
export const rankProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx)
    if (!user) return null
    const { userId } = user

    const settings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const active = await ctx.db
      .query('contacts')
      .withIndex('by_user_mlmStatus', (q) =>
        q.eq('userId', userId).eq('mlmStatus', 'active'),
      )
      .collect()
    const atRisk = await ctx.db
      .query('contacts')
      .withIndex('by_user_mlmStatus', (q) =>
        q.eq('userId', userId).eq('mlmStatus', 'at_risk'),
      )
      .collect()

    // Prochains actifs potentiels : opportunites les plus avancees du pipeline.
    const negotiation = await ctx.db
      .query('opportunities')
      .withIndex('by_user_stage', (q) =>
        q.eq('userId', userId).eq('stage', 'negotiation'),
      )
      .collect()
    const interview = await ctx.db
      .query('opportunities')
      .withIndex('by_user_stage', (q) =>
        q.eq('userId', userId).eq('stage', 'interview'),
      )
      .collect()
    const focus = [...negotiation, ...interview]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5)
      .map((o) => ({ id: o._id, title: o.title, stage: o.stage }))

    const target = settings?.rankGoalTargetActives ?? null
    const activeCount = active.length
    return {
      goalLabel: settings?.rankGoalLabel ?? null,
      target,
      activeCount,
      atRiskCount: atRisk.length,
      remaining: target !== null ? Math.max(0, target - activeCount) : null,
      inFlight: negotiation.length + interview.length,
      focus,
    }
  },
})

/** Definit (ou efface) l'objectif de palier de l'utilisateur. Upsert settings. */
export const setRankGoal = mutation({
  args: {
    label: v.optional(v.string()),
    targetActives: v.optional(v.number()),
  },
  handler: async (ctx, { label, targetActives }) => {
    const { userId } = await requireUser(ctx)
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
    return null
  },
})
