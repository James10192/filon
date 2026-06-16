import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { isAdmin, requireAdmin, type QueryCtx } from './lib/withUser'
import { PRICING, type PaidPlan } from './lib/pricing'
import type { Plan } from './lib/plan'

/**
 * Back-office /admin · gestion utilisateurs, métriques, feedbacks.
 *
 * Toutes les fonctions sont gatées par `requireAdmin` (la SEULE exception est
 * `amIAdmin`, publique et non-throw). C'est le SEUL domaine autorisé à lire en
 * CROSS-TENANT (sans scope `userId`) — et uniquement après `requireAdmin`.
 */

const statusValidator = v.union(
  v.literal('new'),
  v.literal('in_progress'),
  v.literal('done'),
)

const PAID_PLANS: PaidPlan[] = ['pro', 'pro_ai', 'copilot']

/** Lecture cross-tenant de tous les users (réservée admin). */
async function allUsers(ctx: QueryCtx): Promise<Doc<'users'>[]> {
  return ctx.db.query('users').collect()
}

/** Début du mois calendaire courant (epoch ms), pour le quota IA du mois. */
function startOfMonth(): number {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

/** Clé jour `YYYY-MM-DD` (UTC) d'un timestamp, pour grouper les inscriptions. */
function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

/**
 * Query PUBLIQUE, NON gatée, ne throw pas : le user courant est-il admin ?
 * Sert au guard de route et à l'affichage conditionnel de l'entrée de sidebar.
 */
export const amIAdmin = query({
  args: {},
  handler: (ctx) => isAdmin(ctx),
})

/**
 * Liste des utilisateurs (récents d'abord), avec compteurs d'activité.
 * `lastActivityAt` = max(createdAt user, dernière opportunité créée/modifiée).
 * Cross-tenant : réservé admin.
 */
export const listUsers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(args.limit ?? 100, 200)

    const users = await allUsers(ctx)
    users.sort((a, b) => b.createdAt - a.createdAt)
    const page = users.slice(0, limit)

    return Promise.all(
      page.map(async (u) => {
        const opportunities = await ctx.db
          .query('opportunities')
          .withIndex('by_user', (q) => q.eq('userId', u.authId))
          .collect()
        const veilles = await ctx.db
          .query('savedSearches')
          .withIndex('by_user', (q) => q.eq('userId', u.authId))
          .collect()

        let lastActivityAt = u.createdAt
        for (const o of opportunities) {
          const t = Math.max(o.updatedAt, o.createdAt)
          if (t > lastActivityAt) lastActivityAt = t
        }

        const row: {
          _id: typeof u._id
          email: string
          name?: string
          image?: string
          plan: Plan
          createdAt: number
          opportunitiesCount: number
          veillesCount: number
          lastActivityAt: number
        } = {
          _id: u._id,
          email: u.email,
          plan: u.plan ?? 'free',
          createdAt: u.createdAt,
          opportunitiesCount: opportunities.length,
          veillesCount: veilles.length,
          lastActivityAt,
        }
        if (u.name) row.name = u.name
        if (u.image) row.image = u.image
        return row
      }),
    )
  },
})

/**
 * Métriques globales du produit (cross-tenant, réservé admin). MRR estimé =
 * somme des prix mensuels équivalents des abonnements payants actifs (l'annuel
 * est ramené au mois : `annual / 12`).
 */
export const metrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const users = await allUsers(ctx)
    const totalUsers = users.length

    const planDistribution: Record<Plan, number> = {
      free: 0,
      pro: 0,
      pro_ai: 0,
      copilot: 0,
    }
    let estimatedMrrXof = 0
    const now = Date.now()

    for (const u of users) {
      const plan: Plan = u.plan ?? 'free'
      planDistribution[plan] += 1
      // Abonnement payant « actif » : palier payant non expiré.
      const active =
        PAID_PLANS.includes(plan as PaidPlan) &&
        (u.planRenewsAt === undefined || u.planRenewsAt >= now)
      if (active) {
        const price = PRICING[plan as PaidPlan]
        estimatedMrrXof +=
          u.planInterval === 'annual'
            ? Math.round(price.annual / 12)
            : price.monthly
      }
    }

    // Inscriptions sur 30 jours glissants, regroupées par jour (UTC).
    const since = now - 30 * 24 * 60 * 60 * 1000
    const counts = new Map<string, number>()
    for (const u of users) {
      if (u.createdAt >= since) {
        const k = dayKey(u.createdAt)
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
    }
    const signupsByDay: { day: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const day = dayKey(now - i * 24 * 60 * 60 * 1000)
      signupsByDay.push({ day, count: counts.get(day) ?? 0 })
    }

    // Crédits IA consommés sur le mois calendaire courant (cross-tenant).
    const monthStart = startOfMonth()
    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_created', (q) => q.gte('createdAt', monthStart))
      .collect()
    let aiCreditsUsedThisMonth = 0
    for (const row of usage) {
      aiCreditsUsedThisMonth += row.creditsDebited
    }

    const totalOpportunities = (
      await ctx.db.query('opportunities').collect()
    ).length
    const totalVeilles = (await ctx.db.query('savedSearches').collect()).length

    const openFeedback = await ctx.db
      .query('feedback')
      .withIndex('by_status', (q) => q.eq('status', 'new'))
      .collect()
    const inProgressFeedback = await ctx.db
      .query('feedback')
      .withIndex('by_status', (q) => q.eq('status', 'in_progress'))
      .collect()
    const feedbackOpen = openFeedback.length + inProgressFeedback.length

    return {
      totalUsers,
      planDistribution,
      signupsByDay,
      estimatedMrrXof,
      aiCreditsUsedThisMonth,
      totalOpportunities,
      totalVeilles,
      feedbackOpen,
    }
  },
})

/**
 * Liste des feedbacks (récents d'abord), filtrable par statut, avec l'auteur
 * joint (email/name). Cross-tenant : réservé admin.
 */
export const listFeedback = query({
  args: { status: v.optional(statusValidator) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const items = args.status
      ? await ctx.db
          .query('feedback')
          .withIndex('by_status_created', (q) =>
            q.eq('status', args.status as Doc<'feedback'>['status']),
          )
          .order('desc')
          .collect()
      : await ctx.db
          .query('feedback')
          .withIndex('by_created')
          .order('desc')
          .collect()

    return Promise.all(
      items.map(async (f) => {
        const author = await ctx.db
          .query('users')
          .withIndex('by_authId', (q) => q.eq('authId', f.userId))
          .unique()
        const row: {
          _id: typeof f._id
          type: Doc<'feedback'>['type']
          message: string
          context?: string
          status: Doc<'feedback'>['status']
          adminNote?: string
          createdAt: number
          authorEmail?: string
          authorName?: string
        } = {
          _id: f._id,
          type: f.type,
          message: f.message,
          status: f.status,
          createdAt: f.createdAt,
        }
        if (f.context) row.context = f.context
        if (f.adminNote) row.adminNote = f.adminNote
        if (author?.email) row.authorEmail = author.email
        if (author?.name) row.authorName = author.name
        return row
      }),
    )
  },
})

/** Met à jour le statut (et la note interne) d'un feedback. Réservé admin. */
export const updateFeedbackStatus = mutation({
  args: {
    id: v.id('feedback'),
    status: statusValidator,
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Feedback introuvable.')
    }
    const patch: { status: Doc<'feedback'>['status']; adminNote?: string } = {
      status: args.status,
    }
    const note = args.adminNote?.trim()
    if (note) patch.adminNote = note
    await ctx.db.patch(args.id, patch)
    return { ok: true as const }
  },
})
