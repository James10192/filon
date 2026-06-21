import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from './withUser'
import { MANAGER_ROLES, getActiveMembership } from './withOrg'
import { forbiddenError, notFoundError } from './plan'
import { createNotification } from '../notifications'

/**
 * Cœur du pointage de priorité (head sell → opportunité d'un équipier),
 * factorisé pour être partagé entre les mutations publiques
 * (`opportunities.flagPriority/unflagPriority`) et le copilote (outils
 * gouvernés). Le `callerId` est TOUJOURS explicite (pas d'identité implicite) :
 * le contrôle « manager de l'équipe du propriétaire » est revalidé ici, côté
 * serveur, quel que soit l'appelant.
 */

/**
 * Résout une org où `callerId` est MANAGER (admin/head_sell) ET `ownerId` est
 * membre actif. Garde anti-fuite du pointage : un manager ne peut pointer que les
 * opportunités d'un membre de SON équipe. Renvoie l'org ou null.
 */
export async function managerOrgForOwner(
  ctx: MutationCtx,
  callerId: string,
  ownerId: string,
): Promise<Id<'organizations'> | null> {
  const memberships = await ctx.db
    .query('memberships')
    .withIndex('by_user', (q) => q.eq('userId', callerId))
    .collect()
  for (const m of memberships) {
    if (m.status !== 'active') continue
    if (!MANAGER_ROLES.has(m.role)) continue
    const ownerActive = await getActiveMembership(ctx, m.organizationId, ownerId)
    if (ownerActive) return m.organizationId
  }
  return null
}

/** Nom d'affichage d'un user (nom, sinon e-mail, sinon libellé générique). */
async function userDisplayName(
  ctx: MutationCtx,
  authId: string,
): Promise<string> {
  const u = await ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', authId))
    .unique()
  return u?.name?.trim() || u?.email || 'Votre head sell'
}

/**
 * Pointe une opportunité comme prioritaire au nom de `callerId`. Vérifie que le
 * caller est manager de l'équipe du propriétaire, pose l'étiquette structurée,
 * journalise dans la timeline du propriétaire et le notifie. Throw si introuvable
 * ou si le caller n'est pas manager du propriétaire.
 */
export async function flagPriorityFor(
  ctx: MutationCtx,
  callerId: string,
  id: Id<'opportunities'>,
  note?: string,
): Promise<{ title: string }> {
  const doc = await ctx.db.get(id)
  if (!doc) throw notFoundError('Introuvable')
  const ownerId = doc.userId

  const org = await managerOrgForOwner(ctx, callerId, ownerId)
  if (!org) {
    throw forbiddenError(
      'Vous ne pouvez pointer que les opportunités des membres de votre équipe.',
    )
  }

  const flaggedByName = await userDisplayName(ctx, callerId)
  const now = Date.now()
  const cleanNote = note?.trim()
  const patch: Record<string, unknown> = {
    flaggedPriority: true,
    flaggedBy: callerId,
    flaggedByName,
    flaggedAt: now,
    flaggedNote: cleanNote && cleanNote.length > 0 ? cleanNote : undefined,
    updatedAt: now,
  }
  await ctx.db.patch(id, patch as Partial<Doc<'opportunities'>>)

  await ctx.db.insert('activities', {
    userId: ownerId,
    opportunityId: id,
    kind: 'other',
    content: cleanNote
      ? `Priorité pointée par ${flaggedByName} : ${cleanNote}`
      : `Priorité pointée par ${flaggedByName}`,
    createdAt: now,
  })

  if (ownerId !== callerId) {
    await createNotification(ctx, {
      userId: ownerId,
      kind: 'priority_flagged',
      title: `${flaggedByName} a pointé une priorité`,
      body: cleanNote
        ? `« ${doc.title} » : ${cleanNote}`
        : `« ${doc.title} » est à traiter en priorité.`,
      actionUrl: `/app/opportunites/${id}`,
      meta: JSON.stringify({ opportunityId: id }),
    })
  }
  return { title: doc.title }
}

/**
 * Retire le pointage de priorité au nom de `callerId`. Autorisé au propriétaire
 * (qui « solde » la priorité une fois traitée) OU au manager de son équipe.
 */
export async function unflagPriorityFor(
  ctx: MutationCtx,
  callerId: string,
  id: Id<'opportunities'>,
): Promise<{ title: string }> {
  const doc = await ctx.db.get(id)
  if (!doc) throw notFoundError('Introuvable')
  const ownerId = doc.userId
  if (ownerId !== callerId) {
    const org = await managerOrgForOwner(ctx, callerId, ownerId)
    if (!org) throw forbiddenError('Action non autorisée.')
  }
  await ctx.db.patch(id, {
    flaggedPriority: undefined,
    flaggedBy: undefined,
    flaggedByName: undefined,
    flaggedAt: undefined,
    flaggedNote: undefined,
    updatedAt: Date.now(),
  } as Partial<Doc<'opportunities'>>)
  return { title: doc.title }
}
