import { v } from 'convex/values'
import { query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser, type QueryCtx } from './lib/withUser'

/**
 * Filon · agrégats de pilotage (lecture seule).
 *
 * Toutes les fonctions sont multi-tenant strictes : elles commencent par
 * `requireUser(ctx)` et lisent via un index `by_user*`. Jamais de scan global.
 */

type Stage = Doc<'opportunities'>['stage']
type OppType = Doc<'opportunities'>['type']

const STAGES: Stage[] = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
]

const TYPES: OppType[] = ['job_offer', 'spontaneous', 'prospect', 'mission']

/** Stages considérés comme « actifs » (ni gagné, ni perdu). */
const ACTIVE_STAGES = new Set<Stage>([
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
])

/** Date du jour au format ISO (date seule, sans heure) pour comparer aux dueDate. */
function todayISO(): string {
  return new Date(Date.now()).toISOString().slice(0, 10)
}

/** Borne supérieure ISO (date seule) à `days` jours du jour. */
function withinISO(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

/** Charge toutes les opportunités du user (scope by_user). */
async function loadOpportunities(
  ctx: QueryCtx,
  userId: string,
): Promise<Doc<'opportunities'>[]> {
  return ctx.db
    .query('opportunities')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
}

/**
 * Extrait une valeur numérique tolérante du champ libre `compensation`
 * (ex. « 45 000 », « 1 200 000 XOF », « 45k », « ~80 000 / mois »).
 * Retourne 0 si rien d'exploitable. Reste prudent : on prend la première
 * suite de chiffres significative, on gère le suffixe « k » (milliers).
 */
function parseCompensation(raw?: string): number {
  if (!raw) return 0
  const text = raw.toLowerCase()
  // Capture un nombre éventuellement espacé/ponctué, suivi d'un « k » optionnel.
  const match = text.match(/(\d[\d\s.,]*)\s*(k)?/)
  if (!match) return 0
  const digits = match[1].replace(/[^\d]/g, '')
  if (!digits) return 0
  let value = Number.parseInt(digits, 10)
  if (Number.isNaN(value)) return 0
  if (match[2] === 'k') value *= 1000
  return value
}

/**
 * KPIs de pilotage. Forme figée par docs/API-CONTRACT.md.
 */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)

    const opportunities = await loadOpportunities(ctx, userId)

    const byStage = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<
      Stage,
      number
    >
    const byType = Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<
      OppType,
      number
    >

    for (const opp of opportunities) {
      byStage[opp.stage] += 1
      byType[opp.type] += 1
    }

    const totalOpportunities = opportunities.length
    const wonCount = byStage.won
    const lostCount = byStage.lost
    const activeCount = STAGES.filter((s) => ACTIVE_STAGES.has(s)).reduce(
      (sum, s) => sum + byStage[s],
      0,
    )

    // Taux de conversion = gagnées / total des opportunités closes (gagné + perdu).
    const closed = wonCount + lostCount
    const winRate = closed > 0 ? wonCount / closed : 0

    // Relances non terminées (scope by_user_done).
    const openFollowups = await ctx.db
      .query('followups')
      .withIndex('by_user_done', (q) => q.eq('userId', userId).eq('done', false))
      .collect()

    const today = todayISO()
    const upcomingLimit = withinISO(7)
    let followupsOverdue = 0
    let followupsUpcoming = 0
    for (const f of openFollowups) {
      if (f.dueDate < today) followupsOverdue += 1
      else if (f.dueDate <= upcomingLimit) followupsUpcoming += 1
    }

    const proposalsSent = (
      await ctx.db
        .query('proposals')
        .withIndex('by_user_status', (q) =>
          q.eq('userId', userId).eq('status', 'sent'),
        )
        .collect()
    ).length

    const companiesCount = (
      await ctx.db
        .query('companies')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
    ).length

    const contactsCount = (
      await ctx.db
        .query('contacts')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
    ).length

    const documentsCount = (
      await ctx.db
        .query('documents')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
    ).length

    return {
      totalOpportunities,
      byStage,
      byType,
      activeCount,
      wonCount,
      lostCount,
      winRate,
      followupsOverdue,
      followupsUpcoming,
      proposalsSent,
      companiesCount,
      contactsCount,
      documentsCount,
    }
  },
})

/**
 * Répartition par stage dans l'ordre canonique du pipeline (lead → lost).
 */
export const pipeline = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    const opportunities = await loadOpportunities(ctx, userId)

    const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<
      Stage,
      number
    >
    for (const opp of opportunities) counts[opp.stage] += 1

    return STAGES.map((stage) => ({ stage, count: counts[stage] }))
  },
})

/**
 * Entonnoir du pipeline : compte ET valeur cumulée (depuis `compensation`)
 * par étape, dans l'ordre canonique (lead → lost). Fournit aussi les totaux
 * pour le hero du tableau de bord :
 * - `totalCount` / `totalValue` : toutes étapes confondues.
 * - `activeCount` / `activeValue` : étapes ouvertes (ni gagné, ni perdu).
 * - `wonValue` : valeur des opportunités gagnées (valeur réalisée).
 */
export const funnel = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    const opportunities = await loadOpportunities(ctx, userId)

    const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<
      Stage,
      number
    >
    const values = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<
      Stage,
      number
    >

    for (const opp of opportunities) {
      counts[opp.stage] += 1
      values[opp.stage] += parseCompensation(opp.compensation)
    }

    const stages = STAGES.map((stage) => ({
      stage,
      count: counts[stage],
      value: values[stage],
    }))

    const totalCount = opportunities.length
    const totalValue = STAGES.reduce((sum, s) => sum + values[s], 0)
    const activeCount = STAGES.filter((s) => ACTIVE_STAGES.has(s)).reduce(
      (sum, s) => sum + counts[s],
      0,
    )
    const activeValue = STAGES.filter((s) => ACTIVE_STAGES.has(s)).reduce(
      (sum, s) => sum + values[s],
      0,
    )
    const wonValue = values.won

    return { stages, totalCount, totalValue, activeCount, activeValue, wonValue }
  },
})

/**
 * Relances à venir + opportunités dont la prochaine action approche.
 */
export const upcomingActions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const limit = args.limit ?? 8

    const openFollowups = await ctx.db
      .query('followups')
      .withIndex('by_user_done', (q) => q.eq('userId', userId).eq('done', false))
      .collect()

    const today = todayISO()
    const titleCache = new Map<string, string>()
    async function titleFor(
      opportunityId: Doc<'opportunities'>['_id'] | undefined,
    ) {
      if (!opportunityId) return undefined
      const cached = titleCache.get(opportunityId)
      if (cached !== undefined) return cached
      const opp = await ctx.db.get(opportunityId)
      const title = opp && opp.userId === userId ? opp.title : undefined
      if (title) titleCache.set(opportunityId, title)
      return title
    }

    const followups = await Promise.all(
      openFollowups
        .filter((f) => f.dueDate >= today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, limit)
        .map(async (f) => ({
          ...f,
          opportunityTitle: await titleFor(f.opportunityId),
        })),
    )

    const opportunities = (
      await ctx.db
        .query('opportunities')
        .withIndex('by_user_next_action', (q) => q.eq('userId', userId))
        .collect()
    )
      .filter((o) => o.nextActionAt && o.nextActionAt >= today)
      .sort((a, b) => (a.nextActionAt ?? '').localeCompare(b.nextActionAt ?? ''))
      .slice(0, limit)

    return { followups, opportunities }
  },
})

/**
 * Flux d'activité récent, tous opportunités confondues.
 */
export const recentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const limit = args.limit ?? 10

    const activities = await ctx.db
      .query('activities')
      .withIndex('by_user_created', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit)

    const titleCache = new Map<string, string>()
    return Promise.all(
      activities.map(async (a) => {
        let title = titleCache.get(a.opportunityId)
        if (title === undefined) {
          const opp = await ctx.db.get(a.opportunityId)
          title = opp && opp.userId === userId ? opp.title : 'Opportunité'
          titleCache.set(a.opportunityId, title)
        }
        return { ...a, opportunityTitle: title }
      }),
    )
  },
})
