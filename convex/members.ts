import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { AnyCtx } from './lib/withUser'
import { currentPlan, optionalUser, requireUser } from './lib/withUser'
import {
  forbiddenError,
  notFoundError,
  orgMemberLimit,
  planLimitError,
  validationError,
} from './lib/plan'
import {
  carnetSharingEnabled,
  requireOrgAdmin,
  requireOrgMember,
  type OrgRole,
} from './lib/withOrg'
import { createNotification } from './notifications'

/**
 * Domaine members · graphe d'appartenance d'une organisation.
 *
 * Invitations par e-mail (statut 'pending' → 'active' à l'acceptation), gestion
 * des rôles et retrait. Toutes les écritures sont réservées à l'admin de l'org
 * (`requireOrgAdmin`), sauf accepter/refuser sa propre invitation.
 */

const roleValidator = v.union(
  v.literal('admin'),
  v.literal('head_sell'),
  v.literal('commercial'),
  v.literal('sdr'),
)

const ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'administrateur',
  head_sell: 'head sell',
  commercial: 'commercial',
  sdr: 'SDR',
}

function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase()
  if (!email || !email.includes('@') || email.length > 254) {
    throw validationError('Adresse e-mail invalide.')
  }
  return email
}

/** Résout un compte applicatif par e-mail (ou null). */
async function userByEmail(ctx: AnyCtx, email: string) {
  return ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .first()
}

/** Résout le profil applicatif par authId (pour l'affichage des membres). */
async function userByAuthId(ctx: AnyCtx, authId: string) {
  return ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', authId))
    .unique()
}

/** Garde « il reste au moins un admin actif » (hors `excluding`). */
async function ensureNotLastAdmin(
  ctx: AnyCtx,
  organizationId: import('./_generated/dataModel').Id<'organizations'>,
  excludingMembershipId: import('./_generated/dataModel').Id<'memberships'>,
): Promise<void> {
  const admins = await ctx.db
    .query('memberships')
    .withIndex('by_org_role', (q) =>
      q.eq('organizationId', organizationId).eq('role', 'admin'),
    )
    .collect()
  const remaining = admins.filter(
    (a) => a.status === 'active' && a._id !== excludingMembershipId,
  )
  if (remaining.length === 0) {
    throw validationError(
      "Vous ne pouvez pas retirer le dernier administrateur de l'organisation.",
    )
  }
}

/**
 * `api.members.list` : membres de l'org (actifs + invitations en attente),
 * enrichis du nom/photo quand le compte est connu. Réservé aux membres.
 */
export const list = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId)
    const org = await ctx.db.get(args.organizationId)
    const rows = await ctx.db
      .query('memberships')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .collect()
    const out = []
    for (const m of rows) {
      let name: string | null = null
      let image: string | null = null
      if (m.userId) {
        const u = await userByAuthId(ctx, m.userId)
        name = u?.name ?? null
        image = u?.image ?? null
      }
      out.push({
        membershipId: m._id,
        userId: m.userId ?? null,
        email: m.email,
        name,
        image,
        role: m.role,
        status: m.status,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt ?? null,
        isOwner: !!m.userId && org?.ownerId === m.userId,
        // Dérivé serveur (défaut ON) : le FE ne réimplémente jamais la règle
        // `undefined`/`false`. Pilote l'action « Voir le carnet » côté managers.
        sharesCarnet: carnetSharingEnabled(m),
      })
    }
    // Actifs d'abord, propriétaire en tête, puis par nom/e-mail.
    const rank = (s: string) => (s === 'active' ? 0 : 1)
    return out.sort((a, b) => {
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status)
      return (a.name ?? a.email).localeCompare(b.name ?? b.email, 'fr')
    })
  },
})

/**
 * `api.members.invite` : invite une personne par e-mail avec un rôle (admin
 * uniquement). Rejette les doublons, l'auto-invitation et le dépassement de la
 * limite de membres du palier. Si l'e-mail correspond déjà à un compte, on
 * pré-relie le `userId` et on le notifie ; sinon l'invitation reste réclamable
 * (liée au signup via le trigger `onCreate`).
 */
export const invite = mutation({
  args: {
    organizationId: v.id('organizations'),
    email: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireOrgAdmin(ctx, args.organizationId)
    const email = normalizeEmail(args.email)
    if (email === admin.email.toLowerCase()) {
      throw validationError('Vous êtes déjà membre de cette organisation.')
    }
    const existing = await ctx.db
      .query('memberships')
      .withIndex('by_org_email', (q) =>
        q.eq('organizationId', args.organizationId).eq('email', email),
      )
      .collect()
    if (existing.length > 0) {
      throw validationError('Cette personne est déjà invitée ou membre.')
    }
    const org = await ctx.db.get(args.organizationId)
    if (!org) throw notFoundError('Organisation introuvable.')

    // Limite de membres = palier du PROPRIÉTAIRE de l'org. Actifs + en attente
    // comptent (chaque invitation réserve une place).
    const limit = orgMemberLimit(await currentPlan(ctx, org.ownerId))
    if (limit !== null) {
      const all = await ctx.db
        .query('memberships')
        .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
        .collect()
      if (all.length >= limit) {
        throw planLimitError(
          `Votre organisation a atteint la limite de ${limit} membres du palier gratuit. Passez à Pro pour des membres illimités.`,
        )
      }
    }

    const now = Date.now()
    const target = await userByEmail(ctx, email)
    const row: {
      organizationId: typeof args.organizationId
      email: string
      role: OrgRole
      status: 'pending'
      invitedBy: string
      invitedAt: number
      userId?: string
    } = {
      organizationId: args.organizationId,
      email,
      role: args.role,
      status: 'pending',
      invitedBy: admin.userId,
      invitedAt: now,
    }
    if (target) row.userId = target.authId
    const membershipId = await ctx.db.insert('memberships', row)

    if (target) {
      await createNotification(ctx, {
        userId: target.authId,
        kind: 'org_invite',
        title: `Invitation à rejoindre ${org.name}`,
        body: `Vous êtes invité comme ${ROLE_LABELS[args.role]}. Acceptez depuis votre espace Organisation.`,
        actionUrl: '/app/organisation',
        meta: JSON.stringify({ organizationId: args.organizationId, membershipId }),
      })
    }
    return membershipId
  },
})

/** `api.members.setRole` : change le rôle d'un membre (admin uniquement). */
export const setRole = mutation({
  args: { membershipId: v.id('memberships'), role: roleValidator },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.membershipId)
    if (!m) throw notFoundError('Membre introuvable.')
    await requireOrgAdmin(ctx, m.organizationId)
    const org = await ctx.db.get(m.organizationId)
    if (org && m.userId && org.ownerId === m.userId && args.role !== 'admin') {
      throw validationError(
        "Le propriétaire de l'organisation reste administrateur.",
      )
    }
    if (m.role === 'admin' && args.role !== 'admin') {
      await ensureNotLastAdmin(ctx, m.organizationId, m._id)
    }
    await ctx.db.patch(args.membershipId, { role: args.role })
    return null
  },
})

/** `api.members.remove` : retire un membre/invitation (admin uniquement). */
export const remove = mutation({
  args: { membershipId: v.id('memberships') },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.membershipId)
    if (!m) throw notFoundError('Membre introuvable.')
    const admin = await requireOrgAdmin(ctx, m.organizationId)
    const org = await ctx.db.get(m.organizationId)
    if (org && m.userId && org.ownerId === m.userId) {
      throw validationError(
        "Le propriétaire ne peut pas être retiré ; supprimez plutôt l'organisation.",
      )
    }
    if (m.role === 'admin') {
      await ensureNotLastAdmin(ctx, m.organizationId, m._id)
    }
    await ctx.db.delete(args.membershipId)
    if (m.userId && m.userId !== admin.userId && m.status === 'active') {
      await createNotification(ctx, {
        userId: m.userId,
        kind: 'member_removed',
        title: `Retiré de ${org?.name ?? 'une organisation'}`,
        body: 'Vous ne faites plus partie de cette organisation.',
      })
    }
    return null
  },
})

/**
 * `api.members.myInvites` : invitations en attente adressées au user courant
 * (par e-mail). Non bloquante : sûre à monter dans le hub.
 */
export const myInvites = query({
  args: {},
  handler: async (ctx) => {
    const auth = await optionalUser(ctx)
    if (!auth || !auth.email) return []
    const email = auth.email.toLowerCase()
    const rows = await ctx.db
      .query('memberships')
      .withIndex('by_email', (q) => q.eq('email', email))
      .collect()
    const out = []
    for (const m of rows) {
      if (m.status !== 'pending') continue
      const org = await ctx.db.get(m.organizationId)
      if (!org) continue
      out.push({
        membershipId: m._id,
        organizationId: org._id,
        orgName: org.name,
        role: m.role,
        invitedAt: m.invitedAt,
      })
    }
    return out.sort((a, b) => b.invitedAt - a.invitedAt)
  },
})

/** `api.members.acceptInvite` : le user courant accepte une invitation pour lui. */
export const acceptInvite = mutation({
  args: { membershipId: v.id('memberships') },
  handler: async (ctx, args) => {
    const { userId, email } = await requireUser(ctx)
    const m = await ctx.db.get(args.membershipId)
    if (!m) throw notFoundError('Invitation introuvable.')
    const mine =
      m.email.toLowerCase() === email.toLowerCase() || m.userId === userId
    if (!mine) throw forbiddenError("Cette invitation ne vous est pas adressée.")
    if (m.status === 'active') return null

    const org = await ctx.db.get(m.organizationId)
    if (!org) throw notFoundError('Organisation introuvable.')
    const limit = orgMemberLimit(await currentPlan(ctx, org.ownerId))
    if (limit !== null) {
      const all = await ctx.db
        .query('memberships')
        .withIndex('by_org', (q) => q.eq('organizationId', m.organizationId))
        .collect()
      const active = all.filter((x) => x.status === 'active').length
      if (active >= limit) {
        throw planLimitError(
          `L'organisation a atteint sa limite de ${limit} membres.`,
        )
      }
    }

    await ctx.db.patch(args.membershipId, {
      userId,
      status: 'active',
      joinedAt: Date.now(),
    })
    if (m.invitedBy && m.invitedBy !== userId) {
      await createNotification(ctx, {
        userId: m.invitedBy,
        kind: 'invite_accepted',
        title: `${email} a rejoint ${org.name}`,
        body: "L'invitation a été acceptée.",
        actionUrl: '/app/organisation',
      })
    }
    return null
  },
})

/** `api.members.declineInvite` : le user courant refuse une invitation pour lui. */
export const declineInvite = mutation({
  args: { membershipId: v.id('memberships') },
  handler: async (ctx, args) => {
    const { userId, email } = await requireUser(ctx)
    const m = await ctx.db.get(args.membershipId)
    if (!m) return null
    const mine =
      m.email.toLowerCase() === email.toLowerCase() || m.userId === userId
    if (!mine) throw forbiddenError("Cette invitation ne vous est pas adressée.")
    if (m.status === 'pending') await ctx.db.delete(args.membershipId)
    return null
  },
})

/**
 * `api.members.setMyCarnetSharing` : le membre courant active/désactive le
 * partage de SON carnet (contacts, entreprises, relances) avec les managers de
 * CETTE organisation. Défaut ON (opt-out). Ouvert à TOUS les membres actifs (pas
 * réservé aux managers). Patche EXACTEMENT la membership lue par la garde, donc
 * la même ligne que celle consultée par `requireOrgManagerCanReadCarnet`.
 *
 * Ne change RIEN à la visibilité pipeline (team.pipeline / team.metrics).
 */
export const setMyCarnetSharing = mutation({
  args: { organizationId: v.id('organizations'), enabled: v.boolean() },
  handler: async (ctx, args) => {
    const octx = await requireOrgMember(ctx, args.organizationId)
    await ctx.db.patch(octx.membership._id, {
      shareCarnetWithManager: args.enabled,
    })
    return null
  },
})
