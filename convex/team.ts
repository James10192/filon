import { v } from 'convex/values'
import { query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './lib/withUser'
import { ACTIVE_STAGES } from './lib/plan'
import {
  activeMemberships,
  requireOrgManager,
} from './lib/withOrg'

/**
 * Domaine team · lectures transversales d'une organisation (surcouche
 * visibilité). Un manager (admin/head_sell) voit les pipelines de tous les
 * membres ACTIFS, sans qu'aucune donnée métier ne porte d'`organizationId` : on
 * itère les `userId` des membres sur les index `by_user*`. Garde stricte par
 * `requireOrgManager` : aucune fuite hors org.
 */

type Stage = Doc<'opportunities'>['stage']

const STAGE_KEYS: Stage[] = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
]

/** Profil d'affichage d'un membre (résolu une fois par membre). */
type MemberProfile = {
  userId: string
  name: string | null
  email: string
  image: string | null
  role: Doc<'memberships'>['role']
}

/** Résout les profils des membres actifs (avec leur rôle), indexés par userId. */
async function memberProfiles(
  ctx: QueryCtx,
  organizationId: Id<'organizations'>,
): Promise<Map<string, MemberProfile>> {
  const members = await activeMemberships(ctx, organizationId)
  const map = new Map<string, MemberProfile>()
  for (const m of members) {
    if (!m.userId) continue
    const u = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', m.userId!))
      .unique()
    map.set(m.userId, {
      userId: m.userId,
      name: u?.name ?? null,
      email: u?.email ?? m.email,
      image: u?.image ?? null,
      role: m.role,
    })
  }
  return map
}

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

/** Métriques calculées pour un membre (comptage en mémoire sur lecture indexée). */
type MemberMetrics = {
  total: number
  active: number
  won: number
  lost: number
  flagged: number
  overdueFollowups: number
  /** Taux de conversion = gagnées / (gagnées + perdues), 0 si rien de clos. */
  conversion: number
  byStage: Record<Stage, number>
}

function emptyByStage(): Record<Stage, number> {
  return {
    lead: 0,
    contacted: 0,
    applied: 0,
    interview: 0,
    negotiation: 0,
    won: 0,
    lost: 0,
  }
}

/**
 * `api.team.metrics` : métriques par membre actif + totaux de l'org. Réservé aux
 * managers (admin/head_sell). Base des cartes du tableau de bord et des exports
 * Excel/PDF (mêmes lignes, côté client).
 */
export const metrics = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await requireOrgManager(ctx, args.organizationId)
    const profiles = await memberProfiles(ctx, args.organizationId)
    const now = Date.now()

    const perMember: Array<MemberProfile & { metrics: MemberMetrics }> = []

    for (const profile of profiles.values()) {
      const opps = await ctx.db
        .query('opportunities')
        .withIndex('by_user', (q) => q.eq('userId', profile.userId))
        .collect()

      const byStage = emptyByStage()
      let active = 0
      let flagged = 0
      for (const o of opps) {
        byStage[o.stage] += 1
        if ((ACTIVE_STAGES as readonly string[]).includes(o.stage)) active += 1
        if (o.flaggedPriority) flagged += 1
      }
      const won = byStage.won
      const lost = byStage.lost
      const closed = won + lost

      const openFollowups = await ctx.db
        .query('followups')
        .withIndex('by_user_done', (q) =>
          q.eq('userId', profile.userId).eq('done', false),
        )
        .collect()
      const overdueFollowups = openFollowups.filter((f) => {
        const t = new Date(f.dueDate).getTime()
        return Number.isFinite(t) && t < now
      }).length

      perMember.push({
        ...profile,
        metrics: {
          total: opps.length,
          active,
          won,
          lost,
          flagged,
          overdueFollowups,
          conversion: closed > 0 ? won / closed : 0,
          byStage,
        },
      })
    }

    perMember.sort((a, b) =>
      (a.name ?? a.email).localeCompare(b.name ?? b.email, 'fr'),
    )

    // Totaux de l'org (somme des membres).
    const totals: MemberMetrics = {
      total: 0,
      active: 0,
      won: 0,
      lost: 0,
      flagged: 0,
      overdueFollowups: 0,
      conversion: 0,
      byStage: emptyByStage(),
    }
    for (const m of perMember) {
      totals.total += m.metrics.total
      totals.active += m.metrics.active
      totals.won += m.metrics.won
      totals.lost += m.metrics.lost
      totals.flagged += m.metrics.flagged
      totals.overdueFollowups += m.metrics.overdueFollowups
      for (const s of STAGE_KEYS) totals.byStage[s] += m.metrics.byStage[s]
    }
    const totalClosed = totals.won + totals.lost
    totals.conversion = totalClosed > 0 ? totals.won / totalClosed : 0

    return { generatedAt: now, members: perMember, totals }
  },
})
