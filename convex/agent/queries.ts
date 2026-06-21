import { v } from 'convex/values'
import { internalQuery, type QueryCtx } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'

/**
 * Lectures internes du copilote (scopées `userId`), appelées par les outils de
 * lecture (`agent/tools/*` par domaine). Toutes filtrent via un index `by_user*` ;
 * jamais de scan global, jamais de fuite cross-tenant. `internalQuery` = non
 * exposé au client, invoqué uniquement depuis l'action du copilote via `ctx`.
 */

const stageValidator = v.union(
  v.literal('lead'),
  v.literal('contacted'),
  v.literal('applied'),
  v.literal('interview'),
  v.literal('negotiation'),
  v.literal('won'),
  v.literal('lost'),
)

const typeValidator = v.union(
  v.literal('job_offer'),
  v.literal('spontaneous'),
  v.literal('prospect'),
  v.literal('mission'),
)

const priorityValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
)

type Stage = Doc<'opportunities'>['stage']

const ACTIVE_STAGES = new Set<Stage>([
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
])

/**
 * Vue compacte d'une opportunité, pour réponses LLM légères. Résout le NOM de
 * l'entreprise (l'agent doit pouvoir la nommer, pas afficher un id) et expose
 * `nextActionAt`/`hasNextAction` (pour repérer ce qui n'a pas de prochaine action).
 */
async function compactOpp(ctx: QueryCtx, o: Doc<'opportunities'>) {
  let companyName: string | null = null
  if (o.companyId) {
    const c = await ctx.db.get(o.companyId)
    companyName = c?.name ?? null
  }
  return {
    id: o._id,
    title: o.title,
    type: o.type,
    stage: o.stage,
    priority: o.priority,
    companyName,
    deadline: o.deadline ?? null,
    nextActionAt: o.nextActionAt ?? null,
    hasNextAction: Boolean(o.nextActionAt),
    tags: o.tags,
  }
}

export const pipelineSummary = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const byStage: Record<string, number> = {}
    for (const o of rows) byStage[o.stage] = (byStage[o.stage] ?? 0) + 1
    const active = rows.filter((o) => ACTIVE_STAGES.has(o.stage)).length
    return { total: rows.length, active, won: byStage.won ?? 0, byStage }
  },
})

export const listOpportunities = internalQuery({
  args: {
    userId: v.string(),
    stage: v.optional(stageValidator),
    type: v.optional(typeValidator),
    priority: v.optional(priorityValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = args.stage
      ? await ctx.db
          .query('opportunities')
          .withIndex('by_user_stage', (q) =>
            q.eq('userId', args.userId).eq('stage', args.stage!),
          )
          .collect()
      : await ctx.db
          .query('opportunities')
          .withIndex('by_user', (q) => q.eq('userId', args.userId))
          .collect()
    let filtered = rows
    if (args.type) filtered = filtered.filter((o) => o.type === args.type)
    if (args.priority) {
      filtered = filtered.filter((o) => o.priority === args.priority)
    }
    filtered.sort((a, b) => b.createdAt - a.createdAt)
    return Promise.all(
      filtered.slice(0, args.limit ?? 20).map((o) => compactOpp(ctx, o)),
    )
  },
})

/**
 * Opportunités ACTIVES (hors gagnées/perdues) SANS prochaine action planifiée :
 * exactement ce qu'il faut relancer en priorité. Triées des plus anciennes aux
 * plus récentes (les plus vieilles sans action = les plus urgentes). Évite à
 * l'agent de chercher à l'aveugle quand on demande « propose une étape pour chacune ».
 */
export const opportunitiesNeedingAction = internalQuery({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const rows = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const needing = rows
      .filter((o) => ACTIVE_STAGES.has(o.stage) && !o.nextActionAt)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, limit ?? 20)
    return Promise.all(needing.map((o) => compactOpp(ctx, o)))
  },
})

export const searchOpportunities = internalQuery({
  args: { userId: v.string(), query: v.string() },
  handler: async (ctx, { userId, query }) => {
    const trimmed = query.trim()
    if (!trimmed) return []
    const docs = await ctx.db
      .query('opportunities')
      .withSearchIndex('search_title', (q) =>
        q.search('title', trimmed).eq('userId', userId),
      )
      .take(8)
    return Promise.all(docs.map((o) => compactOpp(ctx, o)))
  },
})

export const listProposals = internalQuery({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('sent'),
        v.literal('accepted'),
        v.literal('refused'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const rows = args.status
      ? await ctx.db
          .query('proposals')
          .withIndex('by_user_status', (q) =>
            q.eq('userId', args.userId).eq('status', args.status!),
          )
          .collect()
      : await ctx.db
          .query('proposals')
          .withIndex('by_user', (q) => q.eq('userId', args.userId))
          .collect()
    rows.sort((a, b) => b.createdAt - a.createdAt)
    return rows.slice(0, 20).map((p) => ({
      id: p._id,
      title: p.title,
      status: p.status,
      amount: p.amount ?? null,
      currency: p.currency ?? 'XOF',
    }))
  },
})

export const dueFollowups = internalQuery({
  args: { userId: v.string(), withinDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const withinDays = args.withinDays ?? 7
    const limit = new Date()
    limit.setDate(limit.getDate() + withinDays)
    const limitIso = limit.toISOString()
    const rows = await ctx.db
      .query('followups')
      .withIndex('by_user_done_due', (q) =>
        q.eq('userId', args.userId).eq('done', false).lte('dueDate', limitIso),
      )
      .collect()
    rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return rows.map((f) => ({
      id: f._id,
      label: f.label,
      dueDate: f.dueDate,
      opportunityId: f.opportunityId ?? null,
    }))
  },
})

export const findCompany = internalQuery({
  args: { userId: v.string(), query: v.string() },
  handler: async (ctx, { userId, query }) => {
    const trimmed = query.trim()
    if (!trimmed) return []
    const docs = await ctx.db
      .query('companies')
      .withSearchIndex('search_name', (q) =>
        q.search('name', trimmed).eq('userId', userId),
      )
      .take(5)
    return docs.map((c) => ({
      id: c._id,
      name: c.name,
      sector: c.sector ?? null,
      location: c.location ?? null,
    }))
  },
})

export const findContact = internalQuery({
  args: { userId: v.string(), query: v.string() },
  handler: async (ctx, { userId, query }) => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []
    const rows = await ctx.db
      .query('contacts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    return rows
      .filter((c) =>
        [c.name, c.role, c.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(trimmed),
      )
      .slice(0, 5)
      .map((c) => ({
        id: c._id,
        name: c.name,
        role: c.role ?? null,
        email: c.email ?? null,
      }))
  },
})
