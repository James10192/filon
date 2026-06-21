import { v } from 'convex/values'
import { query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireOrgManager } from './lib/withOrg'
import { computeTeamMetrics, memberProfiles } from './lib/teamMetrics'

/**
 * Domaine team · lectures transversales d'une organisation (surcouche
 * visibilité). Un manager (admin/head_sell) voit les pipelines de tous les
 * membres ACTIFS, sans qu'aucune donnée métier ne porte d'`organizationId` : on
 * itère les `userId` des membres sur les index `by_user*`. Garde stricte par
 * `requireOrgManager` : aucune fuite hors org. Le calcul des métriques est
 * factorisé dans `lib/teamMetrics` (partagé avec le copilote).
 */

/**
 * `api.team.pipeline` : toutes les opportunités des membres actifs, enrichies du
 * nom de la cible et du propriétaire. Alimente le tableau transversal du head
 * sell (colonne « Propriétaire » + action « pointer une priorité »).
 */
export const pipeline = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await requireOrgManager(ctx, args.organizationId)
    const profiles = await memberProfiles(ctx, args.organizationId)

    const companyNames = new Map<Id<'companies'>, string | undefined>()
    const contactNames = new Map<Id<'contacts'>, string | undefined>()
    const resolveCompany = async (id: Id<'companies'>) => {
      if (companyNames.has(id)) return companyNames.get(id)
      const c = await ctx.db.get(id)
      const name = c?.name
      companyNames.set(id, name)
      return name
    }
    const resolveContact = async (id: Id<'contacts'>) => {
      if (contactNames.has(id)) return contactNames.get(id)
      const c = await ctx.db.get(id)
      const name = c?.name
      contactNames.set(id, name)
      return name
    }

    const rows: Array<
      Doc<'opportunities'> & {
        companyName?: string
        contactName?: string
        effectiveTargetType: 'company' | 'person' | 'none'
        ownerUserId: string
        ownerName: string | null
        ownerImage: string | null
      }
    > = []

    for (const userId of profiles.keys()) {
      const opps = await ctx.db
        .query('opportunities')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
      const profile = profiles.get(userId)!
      for (const o of opps) {
        const companyName = o.companyId
          ? await resolveCompany(o.companyId)
          : undefined
        const contactName = o.contactId
          ? await resolveContact(o.contactId)
          : undefined
        const effectiveTargetType: 'company' | 'person' | 'none' =
          o.targetType ??
          (o.companyId ? 'company' : o.contactId ? 'person' : 'none')
        const enriched = {
          ...o,
          effectiveTargetType,
          ownerUserId: userId,
          ownerName: profile.name,
          ownerImage: profile.image,
        } as (typeof rows)[number]
        if (companyName) enriched.companyName = companyName
        if (contactName) enriched.contactName = contactName
        rows.push(enriched)
      }
    }

    // Pointées d'abord, puis plus récentes.
    rows.sort((a, b) => {
      const fa = a.flaggedPriority ? 1 : 0
      const fb = b.flaggedPriority ? 1 : 0
      if (fa !== fb) return fb - fa
      return b.createdAt - a.createdAt
    })

    return {
      members: Array.from(profiles.values()),
      opportunities: rows,
    }
  },
})

/**
 * `api.team.metrics` : métriques par membre actif + totaux de l'org. Réservé aux
 * managers (admin/head_sell). Base des cartes du tableau de bord et des exports
 * Excel/PDF (mêmes lignes, côté client). Calcul factorisé (`lib/teamMetrics`).
 */
export const metrics = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await requireOrgManager(ctx, args.organizationId)
    return computeTeamMetrics(ctx, args.organizationId)
  },
})
