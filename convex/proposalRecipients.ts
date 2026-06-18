import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './lib/withUser'
import { requireUser } from './lib/withUser'
import { forbiddenError, notFoundError, validationError } from './lib/plan'

/**
 * Domaine : destinataires d'une proposition (`api.proposalRecipients.*`).
 *
 * Une PROPOSITION est une offre reutilisable adressee a PLUSIEURS cibles. Chaque
 * destinataire (entreprise ou particulier) est suivi individuellement via une
 * ligne `proposalRecipients` (statut envoye/accepte/refuse + relance, lien
 * eventuel vers une opportunite du pipeline).
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser(ctx)` et scope
 * via un index `by_user*`. Toute ecriture force `userId` cote serveur.
 */

const recipientTargetType = v.union(
  v.literal('company'),
  v.literal('person'),
)

const recipientStatus = v.union(
  v.literal('pending'),
  v.literal('sent'),
  v.literal('accepted'),
  v.literal('refused'),
)

/** Charge une proposition en verifiant qu'elle appartient au user courant. */
async function getOwnedProposal(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  id: Id<'proposals'>,
): Promise<Doc<'proposals'>> {
  const proposal = await ctx.db.get(id)
  if (!proposal) throw notFoundError('Proposition introuvable')
  if (proposal.userId !== userId) throw forbiddenError('Non autorisé')
  return proposal
}

/** Charge un destinataire en verifiant qu'il appartient au user courant. */
async function getOwnedRecipient(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  id: Id<'proposalRecipients'>,
): Promise<Doc<'proposalRecipients'>> {
  const recipient = await ctx.db.get(id)
  if (!recipient) throw notFoundError('Destinataire introuvable')
  if (recipient.userId !== userId) throw forbiddenError('Non autorisé')
  return recipient
}

/**
 * `api.proposalRecipients.listByProposal` : destinataires d'une proposition,
 * noms de cible resolus (companyName / contactName). Verifie la propriete de la
 * proposition. Tri par date de creation ascendante.
 */
export const listByProposal = query({
  args: { proposalId: v.id('proposals') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await getOwnedProposal(ctx, userId, args.proposalId)

    const recipients = await ctx.db
      .query('proposalRecipients')
      .withIndex('by_proposal', (q) => q.eq('proposalId', args.proposalId))
      .collect()

    const owned = recipients.filter((r) => r.userId === userId)
    owned.sort((a, b) => a.createdAt - b.createdAt)
    return resolveRecipientNames(ctx, userId, owned)
  },
})

/**
 * `api.proposalRecipients.listByStatus` : tous les destinataires du user pour un
 * statut donne (ex « sent » a relancer), noms resolus. Sert aux vues de suivi
 * transverses (relances). Scope `by_user_status`.
 */
export const listByStatus = query({
  args: {
    status: v.optional(recipientStatus),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    const rows = args.status
      ? await ctx.db
          .query('proposalRecipients')
          .withIndex('by_user_status', (q) =>
            q.eq('userId', userId).eq('status', args.status!),
          )
          .collect()
      : await ctx.db
          .query('proposalRecipients')
          .withIndex('by_user', (q) => q.eq('userId', userId))
          .collect()

    rows.sort((a, b) => b.createdAt - a.createdAt)
    return resolveRecipientNames(ctx, userId, rows)
  },
})

/**
 * `api.proposalRecipients.addRecipient` : ajoute un destinataire (entreprise ou
 * particulier) a une proposition. Statut initial `pending` (ou fourni). Verifie
 * la propriete de la proposition ET de la cible. Renvoie l'id du destinataire.
 */
export const addRecipient = mutation({
  args: {
    proposalId: v.id('proposals'),
    targetType: recipientTargetType,
    companyId: v.optional(v.id('companies')),
    contactId: v.optional(v.id('contacts')),
    status: v.optional(recipientStatus),
    opportunityId: v.optional(v.id('opportunities')),
    amount: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<'proposalRecipients'>> => {
    const { userId } = await requireUser(ctx)
    await getOwnedProposal(ctx, userId, args.proposalId)

    // Coherence cible : le type doit correspondre a l'id fourni, et l'entite
    // doit appartenir au user.
    if (args.targetType === 'company') {
      if (!args.companyId) {
        throw validationError('Une entreprise cible est requise')
      }
      const company = await ctx.db.get(args.companyId)
      if (!company || company.userId !== userId) {
        throw forbiddenError('Non autorisé')
      }
    } else {
      if (!args.contactId) {
        throw validationError('Un contact cible est requis')
      }
      const contact = await ctx.db.get(args.contactId)
      if (!contact || contact.userId !== userId) {
        throw forbiddenError('Non autorisé')
      }
    }
    if (args.opportunityId) {
      const opp = await ctx.db.get(args.opportunityId)
      if (!opp || opp.userId !== userId) {
        throw forbiddenError('Non autorisé')
      }
    }

    const now = Date.now()
    const status = args.status ?? 'pending'

    const doc: {
      userId: string
      proposalId: Id<'proposals'>
      targetType: 'company' | 'person'
      status: 'pending' | 'sent' | 'accepted' | 'refused'
      createdAt: number
      updatedAt: number
      companyId?: Id<'companies'>
      contactId?: Id<'contacts'>
      opportunityId?: Id<'opportunities'>
      amount?: number
      note?: string
      sentAt?: number
      respondedAt?: number
    } = {
      userId,
      proposalId: args.proposalId,
      targetType: args.targetType,
      status,
      createdAt: now,
      updatedAt: now,
    }
    if (args.targetType === 'company') doc.companyId = args.companyId
    else doc.contactId = args.contactId
    if (args.opportunityId !== undefined) doc.opportunityId = args.opportunityId
    if (args.amount !== undefined) doc.amount = args.amount
    if (args.note?.trim()) doc.note = args.note.trim()
    if (status === 'sent') doc.sentAt = now
    if (status === 'accepted' || status === 'refused') doc.respondedAt = now

    return ctx.db.insert('proposalRecipients', doc)
  },
})

/**
 * `api.proposalRecipients.updateRecipientStatus` : change le statut d'un
 * destinataire. Date `sentAt` au passage en `sent` (sans ecraser), `respondedAt`
 * au passage en `accepted`/`refused`. Verifie la propriete.
 */
export const updateRecipientStatus = mutation({
  args: {
    id: v.id('proposalRecipients'),
    status: recipientStatus,
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const recipient = await getOwnedRecipient(ctx, userId, args.id)

    const now = Date.now()
    const patch: {
      status: 'pending' | 'sent' | 'accepted' | 'refused'
      updatedAt: number
      sentAt?: number
      respondedAt?: number
    } = { status: args.status, updatedAt: now }
    if (args.status === 'sent' && !recipient.sentAt) patch.sentAt = now
    if (
      (args.status === 'accepted' || args.status === 'refused') &&
      !recipient.respondedAt
    ) {
      patch.respondedAt = now
    }

    await ctx.db.patch(args.id, patch)
    return null
  },
})

/**
 * `api.proposalRecipients.updateRecipient` : met a jour les champs editables d'un
 * destinataire (montant, note, opportunite liee). Verifie la propriete (et celle
 * de l'opportunite liee si fournie).
 */
export const updateRecipient = mutation({
  args: {
    id: v.id('proposalRecipients'),
    amount: v.optional(v.number()),
    note: v.optional(v.string()),
    opportunityId: v.optional(v.id('opportunities')),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    await getOwnedRecipient(ctx, userId, args.id)

    if (args.opportunityId !== undefined) {
      const opp = await ctx.db.get(args.opportunityId)
      if (!opp || opp.userId !== userId) {
        throw forbiddenError('Non autorisé')
      }
    }

    const patch: {
      updatedAt: number
      amount?: number
      note?: string
      opportunityId?: Id<'opportunities'>
    } = { updatedAt: Date.now() }
    if (args.amount !== undefined) patch.amount = args.amount
    if (args.note !== undefined) {
      const note = args.note.trim()
      patch.note = note ? note : undefined
    }
    if (args.opportunityId !== undefined) patch.opportunityId = args.opportunityId

    await ctx.db.patch(args.id, patch)
    return null
  },
})

/** `api.proposalRecipients.removeRecipient` : supprime un destinataire. */
export const removeRecipient = mutation({
  args: { id: v.id('proposalRecipients') },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    await getOwnedRecipient(ctx, userId, args.id)
    await ctx.db.delete(args.id)
    return null
  },
})

/**
 * Resout le nom de cible (entreprise ou contact) de chaque destinataire, avec un
 * cache local. Lecture par id, scope garanti par `userId === user courant`.
 */
async function resolveRecipientNames(
  ctx: QueryCtx,
  userId: string,
  recipients: Doc<'proposalRecipients'>[],
): Promise<Array<Doc<'proposalRecipients'> & { targetName?: string }>> {
  const companyNames = new Map<Id<'companies'>, string | undefined>()
  const contactNames = new Map<Id<'contacts'>, string | undefined>()

  return Promise.all(
    recipients.map(async (r) => {
      let targetName: string | undefined
      if (r.targetType === 'company' && r.companyId) {
        if (companyNames.has(r.companyId)) {
          targetName = companyNames.get(r.companyId)
        } else {
          const company = await ctx.db.get(r.companyId)
          targetName =
            company && company.userId === userId ? company.name : undefined
          companyNames.set(r.companyId, targetName)
        }
      } else if (r.targetType === 'person' && r.contactId) {
        if (contactNames.has(r.contactId)) {
          targetName = contactNames.get(r.contactId)
        } else {
          const contact = await ctx.db.get(r.contactId)
          targetName =
            contact && contact.userId === userId ? contact.name : undefined
          contactNames.set(r.contactId, targetName)
        }
      }
      return targetName ? { ...r, targetName } : { ...r }
    }),
  )
}
