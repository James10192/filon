import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { optionalUser, requireUser } from './lib/withUser'
import { validationError } from './lib/plan'
import { getActiveMembership, requireOrgAdmin, requireOrgMember } from './lib/withOrg'

/**
 * Domaine organizations · cycle de vie de l'organisation (équipe).
 *
 * Surcouche visibilité : créer une org relie le créateur (membre 'admin' actif)
 * aux futurs membres invités. Aucune table métier n'est touchée ; la visibilité
 * d'équipe se calcule ailleurs (cf. `convex/team.ts` + `lib/withOrg`).
 */

const NAME_MAX = 80

function normalizeName(raw: string): string {
  const name = raw.trim()
  if (!name) throw validationError("Le nom de l'organisation est requis.")
  if (name.length > NAME_MAX) {
    throw validationError(`Le nom doit faire au plus ${NAME_MAX} caractères.`)
  }
  return name
}

/**
 * `api.organizations.mine` : organisations où le user courant est membre ACTIF,
 * avec son rôle. Non bloquante (renvoie `[]` hors session) : sûre à monter dans
 * la coquille (sidebar, hub). Sert à décider l'affichage du hub par rôle.
 */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const auth = await optionalUser(ctx)
    if (!auth) return []
    const memberships = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', auth.userId))
      .collect()
    const out: Array<{
      organizationId: (typeof memberships)[number]['organizationId']
      membershipId: (typeof memberships)[number]['_id']
      name: string
      role: (typeof memberships)[number]['role']
      isOwner: boolean
    }> = []
    for (const m of memberships) {
      if (m.status !== 'active') continue
      const org = await ctx.db.get(m.organizationId)
      if (!org) continue
      out.push({
        organizationId: org._id,
        membershipId: m._id,
        name: org.name,
        role: m.role,
        isOwner: org.ownerId === auth.userId,
      })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  },
})

/**
 * `api.organizations.get` : détail d'une org pour un de ses membres (nom, rôle
 * du courant, nombre de membres actifs). Throw `FORBIDDEN` si non membre.
 */
export const get = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const octx = await requireOrgMember(ctx, args.organizationId)
    const org = await ctx.db.get(args.organizationId)
    if (!org) return null
    const all = await ctx.db
      .query('memberships')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .collect()
    return {
      organizationId: org._id,
      name: org.name,
      isOwner: org.ownerId === octx.userId,
      myRole: octx.role,
      memberCount: all.filter((m) => m.status === 'active').length,
      pendingCount: all.filter((m) => m.status === 'pending').length,
    }
  },
})

/**
 * `api.organizations.create` : crée une organisation et y inscrit le créateur
 * comme membre 'admin' actif. L'org est ouverte à tous (free inclus) ; la limite
 * de membres (cf. `orgMemberLimit`) s'applique aux invitations, pas à la création
 * (1 membre = toujours en deçà du plafond).
 */
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { userId, email } = await requireUser(ctx)
    const name = normalizeName(args.name)
    const now = Date.now()
    const organizationId = await ctx.db.insert('organizations', {
      name,
      ownerId: userId,
      createdAt: now,
    })
    await ctx.db.insert('memberships', {
      organizationId,
      userId,
      email: email.toLowerCase(),
      role: 'admin',
      status: 'active',
      invitedBy: userId,
      invitedAt: now,
      joinedAt: now,
    })
    return organizationId
  },
})

/** `api.organizations.rename` : renomme l'org (admin uniquement). */
export const rename = mutation({
  args: { organizationId: v.id('organizations'), name: v.string() },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId)
    await ctx.db.patch(args.organizationId, { name: normalizeName(args.name) })
    return null
  },
})

/**
 * `api.organizations.remove` : supprime l'org et toutes ses appartenances
 * (admin uniquement). Les données métier des membres (pipelines) ne sont jamais
 * touchées : on ne supprime que le graphe d'appartenance.
 */
export const remove = mutation({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId)
    const members = await ctx.db
      .query('memberships')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .collect()
    for (const m of members) await ctx.db.delete(m._id)
    await ctx.db.delete(args.organizationId)
    return null
  },
})

/** `api.organizations.leave` : un membre non-admin quitte l'org de lui-même. */
export const leave = mutation({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const membership = await getActiveMembership(ctx, args.organizationId, userId)
    if (!membership) return null
    if (membership.role === 'admin') {
      throw validationError(
        "Un administrateur ne peut pas quitter l'organisation ; transférez le rôle ou supprimez l'organisation.",
      )
    }
    await ctx.db.delete(membership._id)
    return null
  },
})
