import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { requireUser, type MutationCtx, type QueryCtx } from './lib/withUser'

/**
 * Domaine : propositions spontanees / demarchage (`api.proposals.*`).
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser(ctx)` et
 * scope via un index `by_user*`. Toute ecriture force `userId` a la valeur du
 * user courant (jamais depuis les args du client). Avant tout patch/delete ou
 * lecture par id, on verifie `doc.userId === userId` sinon `Non autorise`.
 */

const proposalStatus = v.union(
  v.literal('draft'),
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
  if (!proposal) {
    throw new Error('Introuvable')
  }
  if (proposal.userId !== userId) {
    throw new Error('Non autorise')
  }
  return proposal
}

/**
 * Liste des propositions du user, eventuellement filtrees par statut, triees
 * par `createdAt desc`. Resout le nom de l'entreprise cible quand il existe.
 */
export const list = query({
  args: { status: v.optional(proposalStatus) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    const proposals = args.status
      ? await ctx.db
          .query('proposals')
          .withIndex('by_user_status', (q) =>
            q.eq('userId', userId).eq('status', args.status!),
          )
          .collect()
      : await ctx.db
          .query('proposals')
          .withIndex('by_user', (q) => q.eq('userId', userId))
          .collect()

    proposals.sort((a, b) => b.createdAt - a.createdAt)

    // Resolution du nom d'entreprise (lecture par id, scope deja garanti par
    // appartenance de la proposition au user).
    const companyNames = new Map<Id<'companies'>, string>()
    return Promise.all(
      proposals.map(async (proposal) => {
        let companyName: string | undefined
        if (proposal.companyId) {
          if (companyNames.has(proposal.companyId)) {
            companyName = companyNames.get(proposal.companyId)
          } else {
            const company = await ctx.db.get(proposal.companyId)
            if (company && company.userId === userId) {
              companyName = company.name
              companyNames.set(proposal.companyId, company.name)
            }
          }
        }
        return { ...proposal, companyName }
      }),
    )
  },
})

/** Detail d'une proposition + entreprise cible resolue, ou throw. */
export const get = query({
  args: { id: v.id('proposals') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const proposal = await getOwnedProposal(ctx, userId, args.id)

    let company: Doc<'companies'> | undefined
    if (proposal.companyId) {
      const found = await ctx.db.get(proposal.companyId)
      if (found && found.userId === userId) {
        company = found
      }
    }
    return { ...proposal, company }
  },
})

/**
 * Cree une proposition. Defaults : `status='draft'`, `currency='XOF'`.
 * Si `companyId` fourni, verifie qu'elle appartient au user.
 */
export const create = mutation({
  args: {
    title: v.string(),
    pitch: v.string(),
    companyId: v.optional(v.id('companies')),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.optional(proposalStatus),
  },
  handler: async (ctx, args): Promise<Id<'proposals'>> => {
    const { userId } = await requireUser(ctx)

    if (args.companyId) {
      const company = await ctx.db.get(args.companyId)
      if (!company || company.userId !== userId) {
        throw new Error('Non autorise')
      }
    }

    const now = Date.now()
    const status = args.status ?? 'draft'

    // On construit l'objet dynamiquement : jamais `undefined` dans un insert.
    const doc: {
      userId: string
      title: string
      pitch: string
      status: 'draft' | 'sent' | 'accepted' | 'refused'
      currency: string
      createdAt: number
      updatedAt: number
      companyId?: Id<'companies'>
      amount?: number
      sentAt?: string
    } = {
      userId,
      title: args.title,
      pitch: args.pitch,
      status,
      currency: args.currency ?? 'XOF',
      createdAt: now,
      updatedAt: now,
    }
    if (args.companyId !== undefined) doc.companyId = args.companyId
    if (args.amount !== undefined) doc.amount = args.amount
    if (status === 'sent') doc.sentAt = new Date(now).toISOString()

    return ctx.db.insert('proposals', doc)
  },
})

/**
 * Met a jour les champs editables d'une proposition (pas le statut, voir
 * `setStatus`). Patch + `updatedAt`. Verifie la propriete.
 */
export const update = mutation({
  args: {
    id: v.id('proposals'),
    title: v.optional(v.string()),
    pitch: v.optional(v.string()),
    companyId: v.optional(v.id('companies')),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    await getOwnedProposal(ctx, userId, args.id)

    if (args.companyId) {
      const company = await ctx.db.get(args.companyId)
      if (!company || company.userId !== userId) {
        throw new Error('Non autorise')
      }
    }

    const patch: {
      updatedAt: number
      title?: string
      pitch?: string
      companyId?: Id<'companies'>
      amount?: number
      currency?: string
    } = { updatedAt: Date.now() }
    if (args.title !== undefined) patch.title = args.title
    if (args.pitch !== undefined) patch.pitch = args.pitch
    if (args.companyId !== undefined) patch.companyId = args.companyId
    if (args.amount !== undefined) patch.amount = args.amount
    if (args.currency !== undefined) patch.currency = args.currency

    await ctx.db.patch(args.id, patch)
    return null
  },
})

/**
 * Change le statut d'une proposition + `updatedAt`. Si `status='sent'`,
 * renseigne `sentAt` = maintenant (ISO). Verifie la propriete.
 */
export const setStatus = mutation({
  args: { id: v.id('proposals'), status: proposalStatus },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const proposal = await getOwnedProposal(ctx, userId, args.id)

    const patch: {
      status: 'draft' | 'sent' | 'accepted' | 'refused'
      updatedAt: number
      sentAt?: string
    } = { status: args.status, updatedAt: Date.now() }
    // On date l'envoi au premier passage en `sent`, sans l'ecraser ensuite.
    if (args.status === 'sent' && !proposal.sentAt) {
      patch.sentAt = new Date().toISOString()
    }

    await ctx.db.patch(args.id, patch)
    return null
  },
})

/** Supprime une proposition. Verifie la propriete. */
export const remove = mutation({
  args: { id: v.id('proposals') },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    await getOwnedProposal(ctx, userId, args.id)
    await ctx.db.delete(args.id)
    return null
  },
})
