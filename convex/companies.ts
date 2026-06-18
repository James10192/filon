import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireUser } from './lib/withUser'
import { forbiddenError, notFoundError, validationError } from './lib/plan'

/**
 * Domaine : entreprises ciblees (employeurs, clients potentiels).
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser(ctx)` et
 * scope via un index `by_user*`. Toute ecriture force `userId` cote serveur.
 * Avant tout patch/delete, on verifie `doc.userId === userId`.
 */

/** Verifie qu'une entreprise existe et appartient au user courant. */
async function requireOwnedCompany(
  ctx: { db: { get: (id: Id<'companies'>) => Promise<Doc<'companies'> | null> } },
  id: Id<'companies'>,
  userId: string,
): Promise<Doc<'companies'>> {
  const company = await ctx.db.get(id)
  if (!company) throw notFoundError('Introuvable')
  if (company.userId !== userId) throw forbiddenError('Non autorise')
  return company
}

export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    const { userId } = await requireUser(ctx)
    const companies = await ctx.db
      .query('companies')
      .withIndex('by_user_name', (q) => q.eq('userId', userId))
      .collect()

    const term = search?.trim().toLowerCase()
    const filtered = term
      ? companies.filter((c) => {
          const haystack = [c.name, c.sector, c.location]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(term)
        })
      : companies

    return filtered.sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    )
  },
})

export const get = query({
  args: { id: v.id('companies') },
  handler: async (ctx, { id }) => {
    const { userId } = await requireUser(ctx)
    return requireOwnedCompany(ctx, id, userId)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    website: v.optional(v.string()),
    sector: v.optional(v.string()),
    location: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const name = args.name.trim()
    if (!name) throw validationError('Le nom est requis')

    const doc: {
      userId: string
      name: string
      website?: string
      sector?: string
      location?: string
      source?: string
      notes?: string
      createdAt: number
    } = { userId, name, createdAt: Date.now() }
    if (args.website?.trim()) doc.website = args.website.trim()
    if (args.sector?.trim()) doc.sector = args.sector.trim()
    if (args.location?.trim()) doc.location = args.location.trim()
    if (args.source?.trim()) doc.source = args.source.trim()
    if (args.notes?.trim()) doc.notes = args.notes.trim()

    return ctx.db.insert('companies', doc)
  },
})

export const update = mutation({
  args: {
    id: v.id('companies'),
    name: v.optional(v.string()),
    website: v.optional(v.string()),
    sector: v.optional(v.string()),
    location: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const { userId } = await requireUser(ctx)
    await requireOwnedCompany(ctx, id, userId)

    // Patch dynamique : on n'inclut jamais `undefined`. Les chaines videes
    // explicitement (champ optionnel mis a "") sont effacees via `undefined`,
    // que Convex interprete comme "retirer le champ".
    const patch: Record<string, string | undefined> = {}
    if (fields.name !== undefined) {
      const name = fields.name.trim()
      if (!name) throw validationError('Le nom est requis')
      patch.name = name
    }
    for (const key of ['website', 'sector', 'location', 'source', 'notes'] as const) {
      const value = fields[key]
      if (value !== undefined) {
        const trimmed = value.trim()
        patch[key] = trimmed ? trimmed : undefined
      }
    }

    await ctx.db.patch(id, patch)
    return null
  },
})

export const remove = mutation({
  args: { id: v.id('companies') },
  handler: async (ctx, { id }) => {
    const { userId } = await requireUser(ctx)
    await requireOwnedCompany(ctx, id, userId)

    // Detache les contacts lies (on ne supprime pas le contact).
    const contacts = await ctx.db
      .query('contacts')
      .withIndex('by_user_company', (q) =>
        q.eq('userId', userId).eq('companyId', id),
      )
      .collect()
    for (const contact of contacts) {
      await ctx.db.patch(contact._id, { companyId: undefined })
    }

    // Detache les opportunites liees.
    const opportunities = await ctx.db
      .query('opportunities')
      .withIndex('by_company', (q) => q.eq('companyId', id))
      .collect()
    for (const opp of opportunities) {
      if (opp.userId === userId) {
        await ctx.db.patch(opp._id, { companyId: undefined })
      }
    }

    // Detache les propositions liees.
    const proposals = await ctx.db
      .query('proposals')
      .withIndex('by_company', (q) => q.eq('companyId', id))
      .collect()
    for (const proposal of proposals) {
      if (proposal.userId === userId) {
        await ctx.db.patch(proposal._id, { companyId: undefined })
      }
    }

    await ctx.db.delete(id)
    return null
  },
})
