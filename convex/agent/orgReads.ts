import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../lib/withUser'
import { MANAGER_ROLES, type OrgRole } from '../lib/withOrg'
import { computeTeamMetrics, memberProfiles } from '../lib/teamMetrics'

/**
 * Lectures internes du copilote pour la couche ÉQUIPE (organisations), scopées
 * par `userId` (pas d'identité côté action). Résout l'org active + le rôle du
 * user, puis l'aperçu d'équipe pour les managers. Toute donnée transversale
 * passe par les `userId` des membres ACTIFS : aucune fuite hors org.
 */

const roleValidator = v.union(
  v.literal('admin'),
  v.literal('head_sell'),
  v.literal('commercial'),
  v.literal('sdr'),
)

/** Appartenances ACTIVES d'un user (toutes orgs), avec leur rôle. */
async function activeMembershipsOf(ctx: QueryCtx, userId: string) {
  const rows = await ctx.db
    .query('memberships')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  return rows.filter((m) => m.status === 'active')
}

export type ResolvedOrgRole = {
  organizationId: Id<'organizations'>
  role: OrgRole
} | null

/**
 * Org active + rôle du user pour le copilote. Privilégie une org où il est
 * MANAGER (les outils équipe en ont besoin) ; à défaut, sa première org active.
 * `null` s'il n'appartient à aucune org : le copilote reste mono-utilisateur.
 */
export async function resolveOrgRoleFor(
  ctx: QueryCtx,
  userId: string,
): Promise<ResolvedOrgRole> {
  const memberships = await activeMembershipsOf(ctx, userId)
  if (memberships.length === 0) return null
  const manager = memberships.find((m) => MANAGER_ROLES.has(m.role))
  const chosen = manager ?? memberships[0]
  return { organizationId: chosen.organizationId, role: chosen.role }
}

/**
 * `internal.agent.orgReads.orgRole` : org active + rôle du user (ou null). Sert
 * au gating des outils côté action (le ToolCtx ne porte que `userId`).
 */
export const orgRole = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<ResolvedOrgRole> =>
    resolveOrgRoleFor(ctx, userId),
})

/**
 * `internal.agent.orgReads.teamOverview` : aperçu d'équipe pour un manager.
 * Renvoie le nom de l'org, les métriques par membre + totaux, et les
 * opportunités pointées prioritaires (les plus récentes). Revalide le rôle
 * manager côté serveur : `null` si le user n'est pas manager d'une org.
 */
export const teamOverview = internalQuery({
  args: { userId: v.string(), role: roleValidator },
  handler: async (ctx, { userId }) => {
    const resolved = await resolveOrgRoleFor(ctx, userId)
    if (!resolved || !MANAGER_ROLES.has(resolved.role)) return null
    const { organizationId } = resolved

    const org = await ctx.db.get(organizationId)
    const { members, totals } = await computeTeamMetrics(ctx, organizationId)

    // Opportunités pointées prioritaires de l'équipe (sur les userId des membres
    // actifs uniquement) : la to-do que le manager veut voir en premier.
    const profiles = await memberProfiles(ctx, organizationId)
    const flagged: Array<{
      id: Id<'opportunities'>
      title: string
      ownerName: string | null
      stage: string
      note: string | null
      flaggedAt: number
    }> = []
    for (const profile of profiles.values()) {
      const owned = await ctx.db
        .query('opportunities')
        .withIndex('by_user_flagged', (q) =>
          q.eq('userId', profile.userId).eq('flaggedPriority', true),
        )
        .collect()
      for (const o of owned) {
        flagged.push({
          id: o._id,
          title: o.title,
          ownerName: profile.name,
          stage: o.stage,
          note: o.flaggedNote ?? null,
          flaggedAt: o.flaggedAt ?? o.updatedAt,
        })
      }
    }
    flagged.sort((a, b) => b.flaggedAt - a.flaggedAt)

    return {
      orgName: org?.name ?? null,
      memberCount: members.length,
      totals,
      members: members.map((m) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
        role: m.role,
        metrics: m.metrics,
      })),
      flagged: flagged.slice(0, 10),
    }
  },
})
