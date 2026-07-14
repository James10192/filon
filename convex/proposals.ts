import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { requireUser, type MutationCtx, type QueryCtx } from './lib/withUser'
import { forbiddenError, notFoundError, validationError } from './lib/plan'

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

const proposalKind = v.union(
  v.literal('proposal'),
  v.literal('proforma'),
)

const lineItemValidator = v.object({
  label: v.string(),
  description: v.optional(v.string()),
  quantity: v.number(),
  unitPrice: v.number(),
})

const documentLanguageValidator = v.union(v.literal('fr'), v.literal('en'))
const billingRecipientValidator = v.object({
  name: v.string(),
  attention: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  country: v.optional(v.string()),
  taxId: v.optional(v.string()),
})
const discountValidator = v.object({
  type: v.union(v.literal('fixed'), v.literal('percent')),
  value: v.number(),
})
const taxValidator = v.object({ label: v.string(), rate: v.number() })

type ProposalLineItem = {
  label: string
  description?: string
  quantity: number
  unitPrice: number
}

type BillingRecipient = {
  name: string
  attention?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  taxId?: string
}

type Discount = { type: 'fixed' | 'percent'; value: number }
type Tax = { label: string; rate: number }

function cleanLineItems(items: ProposalLineItem[] | undefined) {
  if (items === undefined) return undefined
  return items
    .map((item) => {
      const label = item.label.trim()
      const description = item.description?.trim()
      return {
        label,
        ...(description ? { description } : {}),
        quantity: Math.max(0, item.quantity),
        unitPrice: Math.max(0, item.unitPrice),
      }
    })
    .filter((item) => item.label && item.quantity > 0)
}

function lineItemsTotal(items: ProposalLineItem[] | undefined) {
  if (!items || items.length === 0) return undefined
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

function cleanBillingRecipient(value: BillingRecipient | undefined) {
  if (value === undefined) return undefined
  const name = value.name.trim()
  if (!name) throw validationError('Le nom du client est requis.')
  const clean: BillingRecipient = { name }
  for (const key of ['attention', 'email', 'phone', 'address', 'city', 'country', 'taxId'] as const) {
    const item = value[key]?.trim()
    if (item) clean[key] = item
  }
  return clean
}

function cleanDiscount(value: Discount | undefined) {
  if (value === undefined) return undefined
  if (!Number.isFinite(value.value) || value.value < 0) {
    throw validationError('La remise doit être positive.')
  }
  if (value.type === 'percent' && value.value > 100) {
    throw validationError('La remise ne peut pas dépasser 100 %.')
  }
  return { type: value.type, value: value.value }
}

function cleanTaxes(values: Tax[] | undefined) {
  if (values === undefined) return undefined
  return values
    .map((tax) => ({ label: tax.label.trim(), rate: tax.rate }))
    .filter((tax) => tax.label)
    .map((tax) => {
      if (!Number.isFinite(tax.rate) || tax.rate < 0 || tax.rate > 100) {
        throw validationError('Chaque taux doit être compris entre 0 et 100 %.')
      }
      return tax
    })
}

function commercialTotal(
  subtotal: number | undefined,
  discount: Discount | undefined,
  taxes: Tax[] | undefined,
) {
  if (subtotal === undefined) return undefined
  const discountAmount = discount
    ? Math.min(subtotal, discount.type === 'percent' ? subtotal * discount.value / 100 : discount.value)
    : 0
  const taxable = subtotal - discountAmount
  const taxAmount = (taxes ?? []).reduce((sum, tax) => sum + taxable * tax.rate / 100, 0)
  return taxable + taxAmount
}

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
    lineItems: v.optional(v.array(lineItemValidator)),
    companyId: v.optional(v.id('companies')),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    terms: v.optional(v.string()),
    clientNote: v.optional(v.string()),
    documentLanguage: v.optional(documentLanguageValidator),
    billingRecipient: v.optional(billingRecipientValidator),
    discount: v.optional(discountValidator),
    taxes: v.optional(v.array(taxValidator)),
    depositAmount: v.optional(v.number()),
    kind: v.optional(proposalKind),
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
      kind: 'proposal' | 'proforma'
      title: string
      pitch: string
      status: 'draft' | 'sent' | 'accepted' | 'refused'
      currency: string
      createdAt: number
      updatedAt: number
      lineItems?: ProposalLineItem[]
      companyId?: Id<'companies'>
      amount?: number
      validUntil?: string
      terms?: string
      clientNote?: string
      documentLanguage?: 'fr' | 'en'
      billingRecipient?: BillingRecipient
      discount?: Discount
      taxes?: Tax[]
      depositAmount?: number
      sentAt?: string
    } = {
      userId,
      kind: args.kind ?? 'proposal',
      title: args.title,
      pitch: args.pitch,
      status,
      currency: args.currency ?? 'XOF',
      createdAt: now,
      updatedAt: now,
    }
    const lineItems = cleanLineItems(args.lineItems)
    const discount = cleanDiscount(args.discount)
    const taxes = cleanTaxes(args.taxes)
    const derivedAmount = commercialTotal(
      lineItemsTotal(lineItems) ?? args.amount,
      discount,
      taxes,
    )
    if (args.depositAmount !== undefined && (!Number.isFinite(args.depositAmount) || args.depositAmount < 0 || (derivedAmount !== undefined && args.depositAmount > derivedAmount))) {
      throw validationError("L'acompte est invalide.")
    }
    if (lineItems !== undefined) doc.lineItems = lineItems
    if (args.companyId !== undefined) doc.companyId = args.companyId
    if (derivedAmount !== undefined) doc.amount = derivedAmount
    else if (args.amount !== undefined) doc.amount = args.amount
    if (args.validUntil !== undefined) doc.validUntil = args.validUntil
    if (args.terms !== undefined) doc.terms = args.terms
    if (args.clientNote !== undefined) doc.clientNote = args.clientNote
    if (args.documentLanguage !== undefined) doc.documentLanguage = args.documentLanguage
    const billingRecipient = cleanBillingRecipient(args.billingRecipient)
    if (billingRecipient !== undefined) doc.billingRecipient = billingRecipient
    if (discount !== undefined) doc.discount = discount
    if (taxes !== undefined) doc.taxes = taxes
    if (args.depositAmount !== undefined) doc.depositAmount = args.depositAmount
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
    lineItems: v.optional(v.array(lineItemValidator)),
    companyId: v.optional(v.id('companies')),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    terms: v.optional(v.string()),
    clientNote: v.optional(v.string()),
    documentLanguage: v.optional(documentLanguageValidator),
    billingRecipient: v.optional(billingRecipientValidator),
    discount: v.optional(discountValidator),
    taxes: v.optional(v.array(taxValidator)),
    depositAmount: v.optional(v.number()),
    kind: v.optional(proposalKind),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const proposal = await getOwnedProposal(ctx, userId, args.id)

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
      lineItems?: ProposalLineItem[]
      companyId?: Id<'companies'>
      amount?: number
      currency?: string
      validUntil?: string
      terms?: string
      clientNote?: string
      kind?: 'proposal' | 'proforma'
      documentLanguage?: 'fr' | 'en'
      billingRecipient?: BillingRecipient
      discount?: Discount
      taxes?: Tax[]
      depositAmount?: number
    } = { updatedAt: Date.now() }
    if (args.title !== undefined) patch.title = args.title
    if (args.pitch !== undefined) patch.pitch = args.pitch
    const discount = args.discount !== undefined ? cleanDiscount(args.discount) : undefined
    const taxes = args.taxes !== undefined ? cleanTaxes(args.taxes) : undefined
    const hasCommercialChange =
      args.lineItems !== undefined ||
      args.amount !== undefined ||
      args.discount !== undefined ||
      args.taxes !== undefined
    if (args.lineItems !== undefined) {
      const lineItems = cleanLineItems(args.lineItems)
      patch.lineItems = lineItems
    }
    if (hasCommercialChange) {
      const effectiveLines = args.lineItems !== undefined
        ? cleanLineItems(args.lineItems)
        : proposal.lineItems
      const baseAmount = lineItemsTotal(effectiveLines) ?? args.amount ?? proposal.amount
      const derivedAmount = commercialTotal(
        baseAmount,
        discount ?? proposal.discount,
        taxes ?? proposal.taxes,
      )
      if (derivedAmount !== undefined) patch.amount = derivedAmount
    }
    if (args.companyId !== undefined) patch.companyId = args.companyId
    if (args.currency !== undefined) patch.currency = args.currency
    if (args.validUntil !== undefined) patch.validUntil = args.validUntil
    if (args.terms !== undefined) patch.terms = args.terms
    if (args.clientNote !== undefined) patch.clientNote = args.clientNote
    if (args.kind !== undefined) patch.kind = args.kind
    if (args.documentLanguage !== undefined) patch.documentLanguage = args.documentLanguage
    if (args.billingRecipient !== undefined) patch.billingRecipient = cleanBillingRecipient(args.billingRecipient)
    if (discount !== undefined) patch.discount = discount
    if (taxes !== undefined) patch.taxes = taxes
    if (args.depositAmount !== undefined) {
      const total = patch.amount ?? proposal.amount
      if (!Number.isFinite(args.depositAmount) || args.depositAmount < 0 || (total !== undefined && args.depositAmount > total)) {
        throw validationError("L'acompte est invalide.")
      }
      patch.depositAmount = args.depositAmount
    }

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
