import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'

/**
 * Lecture interne du copilote pour la couche RÉSEAU (wedge marketing
 * relationnel). Scopée `userId` sur des index `by_user*`, sans identité. Reprend
 * `mlm.rankProgress` : progression vers l'objectif de palier DÉRIVÉE du pipeline
 * et des filleuls. Jamais de chiffre recopié de l'entreprise.
 */

/** Filleuls groupés par statut réseau (contacts `mlmStatus`). */
function groupByMlmStatus(contacts: Doc<'contacts'>[]) {
  const groups: Record<'active' | 'at_risk' | 'inactive' | 'prospect', number> = {
    active: 0,
    at_risk: 0,
    inactive: 0,
    prospect: 0,
  }
  for (const c of contacts) {
    if (c.mlmStatus) groups[c.mlmStatus] += 1
  }
  return groups
}

export const networkStatus = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const contacts = await ctx.db
      .query('contacts')
      .withIndex('by_user_mlmStatus', (q) => q.eq('userId', userId))
      .collect()
    const filleuls = contacts.filter((c) => c.mlmStatus !== undefined)
    const groups = groupByMlmStatus(filleuls)

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
    const activeCount = groups.active
    return {
      goalLabel: settings?.rankGoalLabel ?? null,
      target,
      activeCount,
      atRiskCount: groups.at_risk,
      inactiveCount: groups.inactive,
      prospectCount: groups.prospect,
      remaining: target !== null ? Math.max(0, target - activeCount) : null,
      inFlight: negotiation.length + interview.length,
      focus,
    }
  },
})
