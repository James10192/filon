import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { optionalUser, requireUser } from './lib/withUser'
import { forbiddenError, notFoundError, validationError } from './lib/plan'
import { ensureTagsForUser } from './tags'

/**
 * Domaine : contacts (interlocuteurs), eventuellement rattaches a une entreprise.
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser(ctx)` et
 * scope via un index `by_user*`. Toute ecriture force `userId` cote serveur.
 */

/** Verifie qu'un contact existe et appartient au user courant. */
async function requireOwnedContact(
  ctx: { db: { get: (id: Id<'contacts'>) => Promise<Doc<'contacts'> | null> } },
  id: Id<'contacts'>,
  userId: string,
): Promise<Doc<'contacts'>> {
  const contact = await ctx.db.get(id)
  if (!contact) throw notFoundError('Introuvable')
  if (contact.userId !== userId) throw forbiddenError('Non autorise')
  return contact
}

/** Verifie qu'une entreprise (si fournie) appartient bien au user courant. */
async function assertOwnedCompany(
  ctx: { db: { get: (id: Id<'companies'>) => Promise<Doc<'companies'> | null> } },
  companyId: Id<'companies'>,
  userId: string,
): Promise<void> {
  const company = await ctx.db.get(companyId)
  if (!company || company.userId !== userId) throw forbiddenError('Non autorise')
}

export const list = query({
  args: {
    companyId: v.optional(v.id('companies')),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { companyId, search }) => {
    const user = await optionalUser(ctx)
    if (!user) return []
    const { userId } = user

    const contacts = companyId
      ? await ctx.db
          .query('contacts')
          .withIndex('by_user_company', (q) =>
            q.eq('userId', userId).eq('companyId', companyId),
          )
          .collect()
      : await ctx.db
          .query('contacts')
          .withIndex('by_user', (q) => q.eq('userId', userId))
          .collect()

    const term = search?.trim().toLowerCase()
    const filtered = term
      ? contacts.filter((c) => {
          const haystack = [
            c.name,
            c.role,
            c.email,
            c.phone,
            c.relationship,
            c.location,
            c.referredBy,
            ...(c.tags ?? []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(term)
        })
      : contacts

    // Resout le nom d'entreprise pour chaque contact (cache local).
    const companyNames = new Map<string, string>()
    const withCompany = await Promise.all(
      filtered.map(async (c) => {
        let companyName: string | undefined
        if (c.companyId) {
          const cached = companyNames.get(c.companyId)
          if (cached !== undefined) {
            companyName = cached
          } else {
            const company = await ctx.db.get(c.companyId)
            companyName = company?.name
            if (companyName) companyNames.set(c.companyId, companyName)
          }
        }
        return companyName ? { ...c, companyName } : { ...c }
      }),
    )

    return withCompany.sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    )
  },
})

export const get = query({
  args: { id: v.id('contacts') },
  handler: async (ctx, { id }) => {
    const { userId } = await requireUser(ctx)
    const contact = await requireOwnedContact(ctx, id, userId)
    if (contact.companyId) {
      const company = await ctx.db.get(contact.companyId)
      if (company && company.userId === userId) {
        return { ...contact, company }
      }
    }
    return { ...contact }
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    // Optionnel : un contact peut etre un particulier autonome (sans entreprise).
    companyId: v.optional(v.id('companies')),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Carnet de prospection P2P / parrainage / MLM.
    relationship: v.optional(v.string()),
    location: v.optional(v.string()),
    referredBy: v.optional(v.string()),
    // Etiquettes (noms). Catalogues au passage (idempotent) via `ensureTagsForUser`.
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const name = args.name.trim()
    if (!name) throw validationError('Le nom est requis')
    if (args.companyId) await assertOwnedCompany(ctx, args.companyId, userId)

    const doc: {
      userId: string
      name: string
      companyId?: Id<'companies'>
      role?: string
      email?: string
      phone?: string
      linkedin?: string
      notes?: string
      relationship?: string
      location?: string
      referredBy?: string
      tags?: string[]
      createdAt: number
    } = { userId, name, createdAt: Date.now() }
    if (args.companyId) doc.companyId = args.companyId
    if (args.role?.trim()) doc.role = args.role.trim()
    if (args.email?.trim()) doc.email = args.email.trim()
    if (args.phone?.trim()) doc.phone = args.phone.trim()
    if (args.linkedin?.trim()) doc.linkedin = args.linkedin.trim()
    if (args.notes?.trim()) doc.notes = args.notes.trim()
    if (args.relationship?.trim()) doc.relationship = args.relationship.trim()
    if (args.location?.trim()) doc.location = args.location.trim()
    if (args.referredBy?.trim()) doc.referredBy = args.referredBy.trim()
    if (args.tags && args.tags.length > 0) {
      const tags = await ensureTagsForUser(ctx, userId, args.tags)
      if (tags.length > 0) doc.tags = tags
    }

    return ctx.db.insert('contacts', doc)
  },
})

export const update = mutation({
  args: {
    id: v.id('contacts'),
    name: v.optional(v.string()),
    companyId: v.optional(v.id('companies')),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    notes: v.optional(v.string()),
    relationship: v.optional(v.string()),
    location: v.optional(v.string()),
    referredBy: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...fields }) => {
    const { userId } = await requireUser(ctx)
    await requireOwnedContact(ctx, id, userId)

    const patch: Record<
      string,
      string | string[] | Id<'companies'> | undefined
    > = {}
    if (fields.name !== undefined) {
      const name = fields.name.trim()
      if (!name) throw validationError('Le nom est requis')
      patch.name = name
    }
    if (fields.companyId !== undefined) {
      await assertOwnedCompany(ctx, fields.companyId, userId)
      patch.companyId = fields.companyId
    }
    for (const key of [
      'role',
      'email',
      'phone',
      'linkedin',
      'notes',
      'relationship',
      'location',
      'referredBy',
    ] as const) {
      const value = fields[key]
      if (value !== undefined) {
        const trimmed = value.trim()
        patch[key] = trimmed ? trimmed : undefined
      }
    }
    if (fields.tags !== undefined) {
      const tags = await ensureTagsForUser(ctx, userId, fields.tags)
      patch.tags = tags.length > 0 ? tags : undefined
    }

    await ctx.db.patch(id, patch)
    return null
  },
})

export const remove = mutation({
  args: { id: v.id('contacts') },
  handler: async (ctx, { id }) => {
    const { userId } = await requireUser(ctx)
    await requireOwnedContact(ctx, id, userId)

    // Detache les opportunites liees a ce contact.
    const opportunities = await ctx.db
      .query('opportunities')
      .withIndex('by_contact', (q) => q.eq('contactId', id))
      .collect()
    for (const opp of opportunities) {
      if (opp.userId === userId) {
        await ctx.db.patch(opp._id, { contactId: undefined })
      }
    }

    await ctx.db.delete(id)
    return null
  },
})

/**
 * Compteur d'opportunites liees a une entreprise (lecture seule). Utilise par
 * la page entreprises pour afficher le nombre d'opportunites en cours sans
 * dependre du domaine opportunities. Scope au user courant.
 */
export const countOpportunitiesByCompany = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx)
    if (!user) return {}
    const { userId } = user
    const opportunities = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const counts: Record<string, number> = {}
    for (const opp of opportunities) {
      if (opp.companyId) {
        counts[opp.companyId] = (counts[opp.companyId] ?? 0) + 1
      }
    }
    return counts
  },
})
