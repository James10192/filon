import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { requireUser, type MutationCtx, type QueryCtx } from './lib/withUser'
import { forbiddenError, notFoundError } from './lib/plan'

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
    throw notFoundError('Introuvable')
  }
  if (proposal.userId !== userId) {
    throw forbiddenError('Non autorisé')
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
 * `api.proposals.withRecipients` : detail d'une proposition + la LISTE de ses
 * destinataires (entreprises et/ou particuliers), noms de cible resolus et
 * statuts individuels. C'est la vue multi-cible du modele : la proposition est
 * une offre reutilisable, chaque destinataire est suivi separement. Garde la
 * retro-compat : `companyId`/`company` de la proposition restent exposes.
 */
export const withRecipients = query({
  args: { id: v.id('proposals') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const proposal = await getOwnedProposal(ctx, userId, args.id)

    let company: Doc<'companies'> | undefined
    if (proposal.companyId) {
      const found = await ctx.db.get(proposal.companyId)
      if (found && found.userId === userId) company = found
    }

    const recipientRows = await ctx.db
      .query('proposalRecipients')
      .withIndex('by_proposal', (q) => q.eq('proposalId', args.id))
      .collect()
    const owned = recipientRows.filter((r) => r.userId === userId)
    owned.sort((a, b) => a.createdAt - b.createdAt)

    // Resolution des noms de cible (cache local, scope garanti par userId).
    const companyNames = new Map<Id<'companies'>, string | undefined>()
    const contactNames = new Map<Id<'contacts'>, string | undefined>()
    const recipients = await Promise.all(
      owned.map(async (r) => {
        let targetName: string | undefined
        if (r.targetType === 'company' && r.companyId) {
          if (companyNames.has(r.companyId)) {
            targetName = companyNames.get(r.companyId)
          } else {
            const found = await ctx.db.get(r.companyId)
            targetName =
              found && found.userId === userId ? found.name : undefined
            companyNames.set(r.companyId, targetName)
          }
        } else if (r.targetType === 'person' && r.contactId) {
          if (contactNames.has(r.contactId)) {
            targetName = contactNames.get(r.contactId)
          } else {
            const found = await ctx.db.get(r.contactId)
            targetName =
              found && found.userId === userId ? found.name : undefined
            contactNames.set(r.contactId, targetName)
          }
        }
        return targetName ? { ...r, targetName } : { ...r }
      }),
    )

    return { ...proposal, company, recipients }
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
        throw forbiddenError('Non autorisé')
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
        throw forbiddenError('Non autorisé')
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

/**
 * Convertit une proposition acceptee en opportunite de type `mission`
 * (stage `won`) dans le pipeline. La proposition reste inchangee. Retourne
 * l'id de l'opportunite creee. Verifie la propriete.
 */
export const convertToOpportunity = mutation({
  args: { id: v.id('proposals') },
  handler: async (ctx, args): Promise<Id<'opportunities'>> => {
    const { userId } = await requireUser(ctx)
    const proposal = await getOwnedProposal(ctx, userId, args.id)

    const now = Date.now()

    // Position en fin de colonne « Gagné » (meme convention que opportunities).
    const wonColumn = await ctx.db
      .query('opportunities')
      .withIndex('by_user_stage', (q) =>
        q.eq('userId', userId).eq('stage', 'won'),
      )
      .collect()
    const order = wonColumn.reduce((max, o) => Math.max(max, o.order), -1) + 1

    const doc: {
      userId: string
      title: string
      type: 'mission'
      stage: 'won'
      priority: 'medium'
      tags: string[]
      order: number
      description: string
      createdAt: number
      updatedAt: number
      companyId?: Id<'companies'>
      compensation?: string
    } = {
      userId,
      title: proposal.title,
      type: 'mission',
      stage: 'won',
      priority: 'medium',
      tags: [],
      order,
      description: proposal.pitch,
      createdAt: now,
      updatedAt: now,
    }
    if (proposal.companyId !== undefined) doc.companyId = proposal.companyId

    if (proposal.amount !== undefined) {
      const code = proposal.currency ?? 'XOF'
      doc.compensation = `${new Intl.NumberFormat('fr-FR').format(proposal.amount)} ${code}`
    }

    const opportunityId = await ctx.db.insert('opportunities', doc)

    // Journalise la creation dans la timeline (meme transaction).
    await ctx.db.insert('activities', {
      userId,
      opportunityId,
      kind: 'other',
      content: `Mission créée depuis la proposition : ${proposal.title}`,
      createdAt: now,
    })

    return opportunityId
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
