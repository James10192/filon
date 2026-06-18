import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireUser, type MutationCtx, type QueryCtx } from './lib/withUser'
import { forbiddenError, notFoundError, validationError } from './lib/plan'

/**
 * Domaine : relances (follow-ups).
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser(ctx)` et
 * scope les lectures via un index `by_user*`. Toute écriture force `userId` à
 * la valeur du user courant. Les dates métier (`dueDate`, `doneAt`) sont des
 * strings ISO ; `createdAt` est un number (ms).
 */

type FollowupWithOpportunity = Doc<'followups'> & {
  opportunityTitle?: string
}

/**
 * Résout le titre de l'opportunité liée à chaque relance, en une passe.
 * Vérifie la propriété de l'opportunité (ne fuit jamais un titre cross-tenant).
 */
async function attachOpportunityTitles(
  ctx: QueryCtx,
  userId: string,
  followups: Doc<'followups'>[],
): Promise<FollowupWithOpportunity[]> {
  const ids = new Set<Id<'opportunities'>>()
  for (const f of followups) {
    if (f.opportunityId) ids.add(f.opportunityId)
  }

  const titles = new Map<Id<'opportunities'>, string>()
  await Promise.all(
    [...ids].map(async (id) => {
      const opp = await ctx.db.get(id)
      if (opp && opp.userId === userId) titles.set(id, opp.title)
    }),
  )

  return followups.map((f) => {
    const opportunityTitle = f.opportunityId
      ? titles.get(f.opportunityId)
      : undefined
    return opportunityTitle ? { ...f, opportunityTitle } : { ...f }
  })
}

/** Vérifie qu'une opportunité existe et appartient au user. Throw sinon. */
async function assertOwnedOpportunity(
  ctx: MutationCtx,
  userId: string,
  opportunityId: Id<'opportunities'>,
): Promise<void> {
  const opp = await ctx.db.get(opportunityId)
  if (!opp) throw notFoundError('Introuvable')
  if (opp.userId !== userId) throw forbiddenError('Non autorisé')
}

/** Vérifie qu'une proposition existe et appartient au user. Throw sinon. */
async function assertOwnedProposal(
  ctx: MutationCtx,
  userId: string,
  proposalId: Id<'proposals'>,
): Promise<void> {
  const proposal = await ctx.db.get(proposalId)
  if (!proposal) throw notFoundError('Introuvable')
  if (proposal.userId !== userId) throw forbiddenError('Non autorisé')
}

/**
 * `api.followups.list` — toutes les relances du user, triées `dueDate asc`.
 * Filtres optionnels : `done` (état) et `opportunityId` (relances d'une piste).
 */
export const list = query({
  args: {
    done: v.optional(v.boolean()),
    opportunityId: v.optional(v.id('opportunities')),
    proposalId: v.optional(v.id('proposals')),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    let rows: Doc<'followups'>[]
    if (args.proposalId !== undefined) {
      const proposalId = args.proposalId
      rows = await ctx.db
        .query('followups')
        .withIndex('by_proposal', (q) => q.eq('proposalId', proposalId))
        .collect()
      rows = rows.filter((f) => f.userId === userId)
    } else if (args.opportunityId !== undefined) {
      const opportunityId = args.opportunityId
      rows = await ctx.db
        .query('followups')
        .withIndex('by_opportunity', (q) =>
          q.eq('opportunityId', opportunityId),
        )
        .collect()
      rows = rows.filter((f) => f.userId === userId)
    } else if (args.done !== undefined) {
      const done = args.done
      rows = await ctx.db
        .query('followups')
        .withIndex('by_user_done', (q) =>
          q.eq('userId', userId).eq('done', done),
        )
        .collect()
    } else {
      rows = await ctx.db
        .query('followups')
        .withIndex('by_user_due', (q) => q.eq('userId', userId))
        .collect()
    }

    if (
      (args.opportunityId !== undefined || args.proposalId !== undefined) &&
      args.done !== undefined
    ) {
      rows = rows.filter((f) => f.done === args.done)
    }

    rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return attachOpportunityTitles(ctx, userId, rows)
  },
})

/**
 * `api.followups.upcoming` — relances non terminées dont `dueDate <= now +
 * withinDays` (défaut 7), triées `dueDate asc`.
 */
export const upcoming = query({
  args: { withinDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const withinDays = args.withinDays ?? 7

    const limit = new Date()
    limit.setDate(limit.getDate() + withinDays)
    const limitIso = limit.toISOString()

    const rows = await ctx.db
      .query('followups')
      .withIndex('by_user_done_due', (q) =>
        q.eq('userId', userId).eq('done', false).lte('dueDate', limitIso),
      )
      .collect()

    rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return attachOpportunityTitles(ctx, userId, rows)
  },
})

/**
 * `api.followups.overdue` — relances non terminées dont `dueDate <`
 * aujourd'hui (début de journée locale), triées `dueDate asc`.
 */
export const overdue = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startIso = startOfToday.toISOString()

    const rows = await ctx.db
      .query('followups')
      .withIndex('by_user_done_due', (q) =>
        q.eq('userId', userId).eq('done', false).lt('dueDate', startIso),
      )
      .collect()

    rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return rows
  },
})

/**
 * `api.followups.due` — relances non terminées groupées par échéance, prêtes
 * pour la page « Relances » : `overdue` / `today` / `thisWeek` / `later`.
 * Chaque groupe est trié `dueDate asc` et porte le titre de l'opportunité liée.
 */
export const due = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)

    const rows = await ctx.db
      .query('followups')
      .withIndex('by_user_done', (q) =>
        q.eq('userId', userId).eq('done', false),
      )
      .collect()

    rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const enriched = await attachOpportunityTitles(ctx, userId, rows)

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
    const startOfNextWeek = new Date(startOfToday)
    startOfNextWeek.setDate(startOfNextWeek.getDate() + 7)

    const overdueGroup: FollowupWithOpportunity[] = []
    const today: FollowupWithOpportunity[] = []
    const thisWeek: FollowupWithOpportunity[] = []
    const later: FollowupWithOpportunity[] = []

    for (const f of enriched) {
      const dueMs = new Date(f.dueDate).getTime()
      if (dueMs < startOfToday.getTime()) overdueGroup.push(f)
      else if (dueMs < startOfTomorrow.getTime()) today.push(f)
      else if (dueMs < startOfNextWeek.getTime()) thisWeek.push(f)
      else later.push(f)
    }

    return { overdue: overdueGroup, today, thisWeek, later }
  },
})

/**
 * `api.followups.create` — planifie une relance. `done=false`. Si une
 * opportunité est fournie, sa propriété est vérifiée.
 */
export const create = mutation({
  args: {
    label: v.string(),
    dueDate: v.string(),
    opportunityId: v.optional(v.id('opportunities')),
    proposalId: v.optional(v.id('proposals')),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    const label = args.label.trim()
    if (!label) throw validationError('L’intitulé est requis')
    if (!args.dueDate) throw validationError('La date est requise')

    if (args.opportunityId !== undefined) {
      await assertOwnedOpportunity(ctx, userId, args.opportunityId)
    }
    if (args.proposalId !== undefined) {
      await assertOwnedProposal(ctx, userId, args.proposalId)
    }

    const doc: {
      userId: string
      label: string
      dueDate: string
      done: boolean
      createdAt: number
      opportunityId?: Id<'opportunities'>
      proposalId?: Id<'proposals'>
    } = {
      userId,
      label,
      dueDate: args.dueDate,
      done: false,
      createdAt: Date.now(),
    }
    if (args.opportunityId !== undefined) {
      doc.opportunityId = args.opportunityId
    }
    if (args.proposalId !== undefined) {
      doc.proposalId = args.proposalId
    }

    return ctx.db.insert('followups', doc)
  },
})

/**
 * `api.followups.update` — modifie une relance (intitulé, date, opportunité
 * liée). Vérifie la propriété. N'inclut jamais de champ `undefined`.
 */
export const update = mutation({
  args: {
    id: v.id('followups'),
    label: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    opportunityId: v.optional(v.id('opportunities')),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    const existing = await ctx.db.get(args.id)
    if (!existing) throw notFoundError('Introuvable')
    if (existing.userId !== userId) throw forbiddenError('Non autorisé')

    const patch: Partial<Doc<'followups'>> = {}
    if (args.label !== undefined) {
      const label = args.label.trim()
      if (!label) throw validationError('L’intitulé est requis')
      patch.label = label
    }
    if (args.dueDate !== undefined) {
      if (!args.dueDate) throw validationError('La date est requise')
      patch.dueDate = args.dueDate
    }
    if (args.opportunityId !== undefined) {
      await assertOwnedOpportunity(ctx, userId, args.opportunityId)
      patch.opportunityId = args.opportunityId
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.id, patch)
    }
    return null
  },
})

/**
 * `api.followups.toggle` — marque une relance comme faite / non faite.
 * Set `doneAt` (ISO) quand `done=true`, le retire sinon.
 */
export const toggle = mutation({
  args: { id: v.id('followups'), done: v.boolean() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    const existing = await ctx.db.get(args.id)
    if (!existing) throw notFoundError('Introuvable')
    if (existing.userId !== userId) throw forbiddenError('Non autorisé')

    if (args.done) {
      await ctx.db.patch(args.id, {
        done: true,
        doneAt: new Date().toISOString(),
      })
    } else {
      await ctx.db.patch(args.id, { done: false, doneAt: undefined })
    }
    return null
  },
})

/** `api.followups.remove` — supprime une relance. Vérifie la propriété. */
export const remove = mutation({
  args: { id: v.id('followups') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    const existing = await ctx.db.get(args.id)
    if (!existing) throw notFoundError('Introuvable')
    if (existing.userId !== userId) throw forbiddenError('Non autorisé')

    await ctx.db.delete(args.id)
    return null
  },
})
