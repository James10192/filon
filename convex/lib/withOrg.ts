import type { Doc, Id } from '../_generated/dataModel'
import type { AnyCtx } from './withUser'
import { requireUser } from './withUser'
import { forbiddenError, notFoundError } from './plan'

/**
 * Contrôle d'accès « organisation » (équipe). Calque de `lib/withUser` mais à
 * l'échelle d'une org : résout l'appartenance du user courant et son rôle, et
 * garde les lectures transversales (un manager voit l'équipe, un admin la gère).
 *
 * Modèle = surcouche visibilité : aucune table métier ne porte d'`organizationId`.
 * La visibilité d'équipe se calcule en itérant les `userId` des membres ACTIFS
 * (cf. `activeMemberUserIds`). Le pipeline mono-utilisateur reste intact.
 */

export type OrgRole = 'admin' | 'head_sell' | 'commercial' | 'sdr'

/** Rôles « manager » : voient l'équipe et peuvent pointer une priorité. */
export const MANAGER_ROLES: ReadonlySet<OrgRole> = new Set<OrgRole>([
  'admin',
  'head_sell',
])

/** Contexte d'un membre résolu : son identité + sa ligne d'appartenance + rôle. */
export type OrgContext = {
  userId: string
  email: string
  organizationId: Id<'organizations'>
  membership: Doc<'memberships'>
  role: OrgRole
}

/**
 * Ligne d'appartenance ACTIVE d'un user à une org (ou null). On filtre sur
 * `status === 'active'` : une invitation `pending` ne donne aucun droit.
 */
export async function getActiveMembership(
  ctx: AnyCtx,
  organizationId: Id<'organizations'>,
  userId: string,
): Promise<Doc<'memberships'> | null> {
  const rows = await ctx.db
    .query('memberships')
    .withIndex('by_org_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', userId),
    )
    .collect()
  return rows.find((m) => m.status === 'active') ?? null
}

/**
 * Garde « membre actif de l'org ». Résout le user courant, vérifie son
 * appartenance active, et renvoie le contexte org (identité + rôle). Throw
 * `FORBIDDEN` si non authentifié ou non membre actif.
 */
export async function requireOrgMember(
  ctx: AnyCtx,
  organizationId: Id<'organizations'>,
): Promise<OrgContext> {
  const { userId, email } = await requireUser(ctx)
  const membership = await getActiveMembership(ctx, organizationId, userId)
  if (!membership) {
    throw forbiddenError("Vous n'êtes pas membre de cette organisation.")
  }
  return {
    userId,
    email,
    organizationId,
    membership,
    role: membership.role,
  }
}

/**
 * Garde « manager » (admin ou head sell) : voit l'équipe et pointe les
 * priorités. Throw `FORBIDDEN` sinon.
 */
export async function requireOrgManager(
  ctx: AnyCtx,
  organizationId: Id<'organizations'>,
): Promise<OrgContext> {
  const octx = await requireOrgMember(ctx, organizationId)
  if (!MANAGER_ROLES.has(octx.role)) {
    throw forbiddenError('Action réservée au head sell ou à l’administrateur.')
  }
  return octx
}

/**
 * Garde « administrateur d'org » : gère membres, rôles, réglages et exports.
 * Throw `FORBIDDEN` sinon.
 */
export async function requireOrgAdmin(
  ctx: AnyCtx,
  organizationId: Id<'organizations'>,
): Promise<OrgContext> {
  const octx = await requireOrgMember(ctx, organizationId)
  if (octx.role !== 'admin') {
    throw forbiddenError("Action réservée à l'administrateur de l'organisation.")
  }
  return octx
}

/** Charge une org (ou throw NOT_FOUND). */
export async function getOrgOrThrow(
  ctx: AnyCtx,
  organizationId: Id<'organizations'>,
): Promise<Doc<'organizations'>> {
  const org = await ctx.db.get(organizationId)
  if (!org) throw notFoundError('Organisation introuvable.')
  return org
}

/** Toutes les lignes d'appartenance ACTIVES d'une org. */
export async function activeMemberships(
  ctx: AnyCtx,
  organizationId: Id<'organizations'>,
): Promise<Doc<'memberships'>[]> {
  const rows = await ctx.db
    .query('memberships')
    .withIndex('by_org', (q) => q.eq('organizationId', organizationId))
    .collect()
  return rows.filter((m) => m.status === 'active')
}

/**
 * `userId` des membres ACTIFS d'une org (ceux dont l'invitation est réclamée).
 * Base de la lecture transversale : on itère ces ids sur les index `by_user*`.
 */
export async function activeMemberUserIds(
  ctx: AnyCtx,
  organizationId: Id<'organizations'>,
): Promise<string[]> {
  const members = await activeMemberships(ctx, organizationId)
  const ids: string[] = []
  for (const m of members) {
    if (m.userId) ids.push(m.userId)
  }
  return ids
}

/**
 * SOURCE DE VÉRITÉ UNIQUE du consentement carnet (défaut ON / opt-out).
 * `undefined` ou `true` => partagé ; seul `false` bloque. Ne JAMAIS tester
 * `=== true` ailleurs (cela masquerait les lignes legacy `undefined`). Consommé
 * par la garde backend ET exposé en dérivé `sharesCarnet` côté `members.list`.
 */
export function carnetSharingEnabled(m: Doc<'memberships'>): boolean {
  return m.shareCarnetWithManager !== false
}

/**
 * Garde « un manager peut lire le carnet (contacts/entreprises/relances) de
 * `targetUserId` ». SEULE source de vérité d'accès au carnet d'autrui ; aucun
 * gating de palier à l'intérieur (la sécurité ne dépend jamais du plan).
 *
 * ORDRE IMPÉRATIF (anti-fuite cross-org) :
 *  1. `requireOrgManager` — le viewer est admin/head_sell de CETTE org.
 *  2. self : un manager lit toujours son propre carnet (jamais bloqué par son flag).
 *  3. `getActiveMembership(orgId, target)` via `by_org_user` (scopé à l'org).
 *  4. cible introuvable/inactive => THROW **avant** de lire le flag. Crucial :
 *     `targetUserId: v.string()` ne valide que le type ; sans ce throw, une cible
 *     d'une AUTRE org (membership null) passerait (`null?.x === false` est faux).
 *  5. flag lu UNIQUEMENT sur le Doc retourné (jamais via `by_user`).
 *
 * Retourne l'`OrgContext` du VIEWER (manager) — `octx.userId` = viewer pour le
 * journal d'accès.
 */
export async function requireOrgManagerCanReadCarnet(
  ctx: AnyCtx,
  organizationId: Id<'organizations'>,
  targetUserId: string,
): Promise<OrgContext> {
  const octx = await requireOrgManager(ctx, organizationId)
  if (targetUserId === octx.userId) return octx
  const target = await getActiveMembership(ctx, organizationId, targetUserId)
  if (!target) {
    throw forbiddenError('Ce membre ne fait pas partie de votre organisation.')
  }
  if (!carnetSharingEnabled(target)) {
    throw forbiddenError('Ce membre a désactivé le partage de son carnet.')
  }
  return octx
}
