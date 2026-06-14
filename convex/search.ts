import { v } from 'convex/values'
import { query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { requireUser } from './lib/withUser'

/**
 * Recherche globale de la palette de commandes (Cmd+K / Ctrl+K).
 *
 * Multi-tenant strict : `requireUser` puis recherche plein texte scopee par
 * `userId` via les index de recherche Convex (`search_title` / `search_name`).
 * Resultats plafonnes par groupe pour rester instantanes. Le terme vide est
 * traite cote serveur (retour vide), donc l'appelant peut toujours passer une
 * string (jamais `undefined` en arg Convex).
 */

const PER_GROUP = 5

export type SearchHit = {
  id: string
  title: string
  subtitle?: string
}

export type GlobalSearchResult = {
  opportunities: SearchHit[]
  companies: SearchHit[]
  proposals: SearchHit[]
}

const EMPTY: GlobalSearchResult = {
  opportunities: [],
  companies: [],
  proposals: [],
}

export const global = query({
  args: { term: v.string() },
  handler: async (ctx, { term }): Promise<GlobalSearchResult> => {
    const { userId } = await requireUser(ctx)
    const trimmed = term.trim()
    if (trimmed.length === 0) return EMPTY

    // Cache local des noms d'entreprise pour eviter les lectures redondantes.
    const companyName = new Map<Id<'companies'>, string | undefined>()
    async function resolveCompany(
      companyId: Id<'companies'> | undefined,
    ): Promise<string | undefined> {
      if (!companyId) return undefined
      if (companyName.has(companyId)) return companyName.get(companyId)
      const company = await ctx.db.get(companyId)
      const name =
        company && company.userId === userId ? company.name : undefined
      companyName.set(companyId, name)
      return name
    }

    const [opportunityDocs, companyDocs, proposalDocs] = await Promise.all([
      ctx.db
        .query('opportunities')
        .withSearchIndex('search_title', (q) =>
          q.search('title', trimmed).eq('userId', userId),
        )
        .take(PER_GROUP),
      ctx.db
        .query('companies')
        .withSearchIndex('search_name', (q) =>
          q.search('name', trimmed).eq('userId', userId),
        )
        .take(PER_GROUP),
      ctx.db
        .query('proposals')
        .withSearchIndex('search_title', (q) =>
          q.search('title', trimmed).eq('userId', userId),
        )
        .take(PER_GROUP),
    ])

    const opportunities: SearchHit[] = await Promise.all(
      opportunityDocs.map(async (o) => ({
        id: o._id,
        title: o.title,
        subtitle: await resolveCompany(o.companyId),
      })),
    )

    const companies: SearchHit[] = companyDocs.map((c) => ({
      id: c._id,
      title: c.name,
      subtitle: c.sector || c.location || undefined,
    }))

    const proposals: SearchHit[] = await Promise.all(
      proposalDocs.map(async (p) => ({
        id: p._id,
        title: p.title,
        subtitle: await resolveCompany(p.companyId),
      })),
    )

    return { opportunities, companies, proposals }
  },
})
