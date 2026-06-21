import { internal } from '../../_generated/api'
import { forbiddenError } from '../../lib/plan'
import { requireUserId } from './shared'
import type { OrgRole } from '../../lib/withOrg'

/**
 * Contexte ORGANISATION du ToolCtx du copilote. Le ToolCtx ne porte que
 * `userId` ; ce helper résout l'org active + le rôle du user via un
 * `internalQuery` (`agent.orgReads.orgRole`). Les outils équipe revalident le
 * rôle MANAGER ici ET côté serveur (la mutation/lecture déléguée le revérifie).
 */

const MANAGER_ROLES: ReadonlySet<OrgRole> = new Set<OrgRole>([
  'admin',
  'head_sell',
])

export type ToolOrgContext = {
  organizationId: string
  role: OrgRole
}

/** Org active + rôle du user du ToolCtx (ou null s'il n'a pas d'org). */
export async function resolveOrgRole(ctx: {
  userId?: string
  runQuery: (ref: any, args: any) => Promise<any>
}): Promise<ToolOrgContext | null> {
  const userId = requireUserId(ctx)
  const resolved = (await ctx.runQuery(internal.agent.orgReads.orgRole, {
    userId,
  })) as ToolOrgContext | null
  return resolved
}

/** Le rôle résolu est-il un rôle manager (admin/head_sell) ? */
export function isManagerRole(role: OrgRole): boolean {
  return MANAGER_ROLES.has(role)
}

/**
 * Garde « manager » d'un outil équipe. Renvoie le contexte org si le user est
 * manager d'une org ; throw FORBIDDEN sinon. À appeler en tête d'un outil équipe.
 */
export async function requireManagerOrg(ctx: {
  userId?: string
  runQuery: (ref: any, args: any) => Promise<any>
}): Promise<ToolOrgContext> {
  const resolved = await resolveOrgRole(ctx)
  if (!resolved || !isManagerRole(resolved.role)) {
    throw forbiddenError('Action réservée au head sell ou à l’administrateur.')
  }
  return resolved
}
