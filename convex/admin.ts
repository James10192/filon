import { v } from 'convex/values'
import { action, internalMutation, mutation, query } from './_generated/server'
import { api } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { isAdmin, requireAdmin, type QueryCtx } from './lib/withUser'
import { PRICING, type PaidPlan } from './lib/pricing'
import { createNotification } from './notifications'
import {
  forbiddenError,
  notFoundError,
  validationError,
  type Plan,
} from './lib/plan'
import { copilot } from './agent/agent'
import type { MessageDoc } from '@convex-dev/agent'

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

const PAID_PLANS: PaidPlan[] = ['pro', 'pro_ai', 'copilot', 'copilot_max']

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
      copilot_max: 0,
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
          priority?: 'low' | 'medium' | 'high'
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
        if (f.priority) row.priority = f.priority
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
      throw notFoundError('Feedback introuvable.')
    }
    const patch: { status: Doc<'feedback'>['status']; adminNote?: string } = {
      status: args.status,
    }
    const note = args.adminNote?.trim()
    if (note) patch.adminNote = note
    await ctx.db.patch(args.id, patch)

    const statusChanged = existing.status !== args.status
    const actionUrl =
      existing.context && existing.context.startsWith('/app')
        ? existing.context
        : undefined

    if (statusChanged && args.status === 'in_progress') {
      await createNotification(ctx, {
        userId: existing.userId,
        kind: 'product_update',
        title: 'Feedback pris en compte',
        body: note
          ? `Nous avons bien pris en charge votre retour. Note de l'équipe : ${note}`
          : 'Nous avons bien pris en charge votre retour. Merci, nous sommes dessus.',
        ...(actionUrl ? { actionUrl, actionLabel: 'Voir le contexte' } : {}),
        meta: JSON.stringify({
          feedbackId: existing._id,
          type: existing.type,
          status: args.status,
        }),
      })
    }

    if (statusChanged && args.status === 'done') {
      await createNotification(ctx, {
        userId: existing.userId,
        kind: 'feedback_resolved',
        title: 'Feedback traité',
        body: note
          ? `Votre retour a été traité. Note de l'équipe : ${note}`
          : 'Votre retour a été traité par l’équipe produit. Merci pour votre aide.',
        ...(actionUrl ? { actionUrl, actionLabel: 'Voir le contexte' } : {}),
        meta: JSON.stringify({
          feedbackId: existing._id,
          type: existing.type,
          status: args.status,
        }),
      })
    }
    return { ok: true as const }
  },
})

export const publishProductUpdate = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    actionUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const title = args.title.trim()
    const body = args.body.trim()
    const actionUrl = args.actionUrl?.trim()

    if (!title) throw validationError('Le titre est requis.')
    if (!body) throw validationError('Le contenu est requis.')

    const users = await allUsers(ctx)
    let sent = 0
    for (const user of users) {
      await createNotification(ctx, {
        userId: user.authId,
        kind: 'product_update',
        title,
        body,
        ...(actionUrl ? { actionUrl, actionLabel: 'Voir la mise à jour' } : {}),
      })
      sent += 1
    }

    return { sent }
  },
})

/**
 * Triage feedback en ligne de commande (ops). `internalMutation` : non exposé au
 * client, donc pas de gate `requireAdmin` (l'accès CLI = accès déploiement, déjà
 * privilégié). Appelé via `npx convex run admin:opsSetFeedbackStatus`.
 */
export const opsSetFeedbackStatus = internalMutation({
  args: {
    id: v.id('feedback'),
    status: statusValidator,
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) throw notFoundError('Feedback introuvable.')
    const patch: { status: Doc<'feedback'>['status']; adminNote?: string } = {
      status: args.status,
    }
    const note = args.adminNote?.trim()
    if (note) patch.adminNote = note
    await ctx.db.patch(args.id, patch)
    return { ok: true as const }
  },
})

/**
 * Métriques des feedbacks (cross-tenant, réservé admin) : volume total, par
 * statut (new/in_progress/done), par type (bug/idea/other), reçus sur 7 jours
 * glissants, et taux de résolution (`done / total`). Sert l'encart de pilotage
 * du back-office. Lit le journal complet (volume modeste) après `requireAdmin`.
 */
export const feedbackMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const items = await ctx.db.query('feedback').collect()
    const total = items.length

    const byStatus: Record<Doc<'feedback'>['status'], number> = {
      new: 0,
      in_progress: 0,
      done: 0,
    }
    const byType: Record<Doc<'feedback'>['type'], number> = {
      bug: 0,
      idea: 0,
      other: 0,
    }
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    let recent7d = 0
    for (const f of items) {
      byStatus[f.status] += 1
      byType[f.type] += 1
      if (f.createdAt >= since) recent7d += 1
    }

    const resolutionRate = total === 0 ? 0 : byStatus.done / total

    return { total, byStatus, byType, recent7d, resolutionRate }
  },
})

/**
 * Détail d'UN feedback (cross-tenant, réservé admin) : le feedback complet plus
 * l'auteur résolu (nom/email/plan) et le contexte (page d'origine). Throw une
 * `ConvexError` `NOT_FOUND` si l'id est inconnu (message visible côté client).
 */
export const feedbackDetail = query({
  args: { id: v.id('feedback') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const feedback = await ctx.db.get(args.id)
    if (!feedback) throw notFoundError('Feedback introuvable.')

    const author = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', feedback.userId))
      .unique()

    const feedbackOut: {
      _id: typeof feedback._id
      type: Doc<'feedback'>['type']
      message: string
      status: Doc<'feedback'>['status']
      context?: string
      pageTitle?: string
      browser?: string
      viewport?: string
      userPlan?: string
      organizationId?: string
      entityType?: string
      entityId?: string
      priority?: 'low' | 'medium' | 'high'
      screenshotUrl?: string
      canContactBack?: boolean
      adminNote?: string
      createdAt: number
    } = {
      _id: feedback._id,
      type: feedback.type,
      message: feedback.message,
      status: feedback.status,
      createdAt: feedback.createdAt,
    }
    if (feedback.context) feedbackOut.context = feedback.context
    if (feedback.pageTitle) feedbackOut.pageTitle = feedback.pageTitle
    if (feedback.browser) feedbackOut.browser = feedback.browser
    if (feedback.viewport) feedbackOut.viewport = feedback.viewport
    if (feedback.userPlan) feedbackOut.userPlan = feedback.userPlan
    if (feedback.organizationId) feedbackOut.organizationId = feedback.organizationId
    if (feedback.entityType) feedbackOut.entityType = feedback.entityType
    if (feedback.entityId) feedbackOut.entityId = feedback.entityId
    if (feedback.priority) feedbackOut.priority = feedback.priority
    if (feedback.screenshotUrl) feedbackOut.screenshotUrl = feedback.screenshotUrl
    if (feedback.canContactBack !== undefined) {
      feedbackOut.canContactBack = feedback.canContactBack
    }
    if (feedback.adminNote) feedbackOut.adminNote = feedback.adminNote

    const authorOut: {
      userId: string
      name?: string
      email?: string
      plan: Plan
    } | null = author
      ? {
          userId: author.authId,
          plan: author.plan ?? 'free',
        }
      : null
    if (author?.name && authorOut) authorOut.name = author.name
    if (author?.email && authorOut) authorOut.email = author.email

    return { feedback: feedbackOut, author: authorOut }
  },
})

function parseJsonObject(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function previewFromMessage(message: MessageDoc): string {
  const directText = (message as { text?: unknown }).text
  if (typeof directText === 'string' && directText.trim()) {
    return directText.trim()
  }

  const parts = (message as { parts?: unknown }).parts
  if (!Array.isArray(parts)) return ''

  const snippets = parts
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      const candidate = part as {
        type?: string
        text?: string
        toolName?: string
        state?: string
        output?: unknown
      }

      if (candidate.type === 'text' && typeof candidate.text === 'string') {
        return candidate.text.trim()
      }

      if (
        candidate.state === 'output-available' &&
        candidate.output &&
        typeof candidate.output === 'object'
      ) {
        const output = candidate.output as {
          approvalRequired?: boolean
          summary?: string
        }
        if (output.approvalRequired && typeof output.summary === 'string') {
          return output.summary.trim()
        }
      }

      if (candidate.type === 'dynamic-tool' && typeof candidate.toolName === 'string') {
        return `Outil : ${candidate.toolName}`
      }

      if (typeof candidate.type === 'string' && candidate.type.startsWith('tool-')) {
        return `Outil : ${candidate.type.replace(/^tool-/, '')}`
      }

      return ''
    })
    .filter((value): value is string => Boolean(value))

  return snippets.join('\n').trim()
}

export const incidentsMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const rows = await ctx.db.query('appErrors').collect()
    const byLevel = { info: 0, warning: 0, error: 0 }
    const byFeature = new Map<string, number>()
    let open = 0
    for (const row of rows) {
      byLevel[row.level] += 1
      byFeature.set(row.feature, (byFeature.get(row.feature) ?? 0) + 1)
      if (row.resolvedAt === undefined) open += 1
    }
    return {
      total: rows.length,
      open,
      byLevel,
      byFeature: Array.from(byFeature.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([feature, count]) => ({ feature, count })),
    }
  },
})

export const listIncidents = query({
  args: { level: v.optional(v.union(v.literal('all'), v.literal('info'), v.literal('warning'), v.literal('error'))) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const level = args.level
    const rows =
      level && level !== 'all'
        ? await ctx.db
            .query('appErrors')
            .withIndex('by_level_created', (q) => q.eq('level', level))
            .order('desc')
            .take(100)
        : await ctx.db
            .query('appErrors')
            .withIndex('by_created')
            .order('desc')
            .take(100)

    return Promise.all(
      rows.map(async (row) => {
        const user =
          row.userId !== undefined
            ? await ctx.db
                .query('users')
                .withIndex('by_authId', (q) => q.eq('authId', row.userId as string))
                .unique()
            : null
        return {
          _id: row._id,
          source: row.source,
          feature: row.feature,
          action: row.action,
          message: row.message,
          level: row.level,
          route: row.route,
          metadata: parseJsonObject(row.metadata),
          createdAt: row.createdAt,
          resolvedAt: row.resolvedAt,
          userName: user?.name,
          userEmail: user?.email,
        }
      }),
    )
  },
})

export const resolveIncident = mutation({
  args: { id: v.id('appErrors'), resolved: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const row = await ctx.db.get(args.id)
    if (!row) throw notFoundError('Incident introuvable.')
    await ctx.db.patch(args.id, {
      resolvedAt: args.resolved ? Date.now() : undefined,
    })
    return { ok: true as const }
  },
})

export const aiOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const [threads, actions, usage, allEvents] = await Promise.all([
      ctx.db.query('aiThreads').collect(),
      ctx.db.query('aiActions').collect(),
      ctx.db.query('aiUsage').withIndex('by_created', (q) => q.gte('createdAt', startOfMonth())).collect(),
      ctx.db.query('aiEvents').collect(),
    ])
    const byType = new Map<string, number>()
    let failures = 0
    for (const event of allEvents) {
      byType.set(event.type, (byType.get(event.type) ?? 0) + 1)
      if (event.level === 'error') failures += 1
    }

    const recentThreads = await Promise.all(
      threads
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
        .slice(0, 20)
        .map(async (thread) => {
          const user = await ctx.db
            .query('users')
            .withIndex('by_authId', (q) => q.eq('authId', thread.userId))
            .unique()
          return {
            threadId: thread.threadId,
            title: thread.title ?? 'Conversation',
            lastMessageAt: thread.lastMessageAt,
            createdAt: thread.createdAt,
            userName: user?.name,
            userEmail: user?.email ?? thread.userId,
          }
        }),
    )

    const recentEvents = await Promise.all(
      allEvents
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 50)
        .map(async (event) => {
          const user = await ctx.db
            .query('users')
            .withIndex('by_authId', (q) => q.eq('authId', event.userId))
            .unique()
          return {
            _id: event._id,
            userId: event.userId,
            userName: user?.name,
            userEmail: user?.email ?? event.userId,
            threadId: event.threadId,
            type: event.type,
            level: event.level,
            message: event.message,
            tool: event.tool,
            model: event.model,
            mode: event.mode,
            metadata: parseJsonObject(event.metadata),
            createdAt: event.createdAt,
          }
        }),
    )

    let credits = 0
    for (const row of usage) credits += row.creditsDebited

    return {
      totals: {
        threads: threads.length,
        actions: actions.length,
        failures,
        credits,
      },
      byType: Array.from(byType.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([type, count]) => ({ type, count })),
      recentThreads,
      recentEvents,
    }
  },
})

export const aiThreadDetail = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const thread = await ctx.db
      .query('aiThreads')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .unique()
    if (!thread) throw notFoundError('Conversation IA introuvable.')

    const user = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', thread.userId))
      .unique()

    const [events, actions] = await Promise.all([
      ctx.db
        .query('aiEvents')
        .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
        .collect(),
      ctx.db
        .query('aiActions')
        .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
        .collect(),
    ])

    const paginated = await copilot.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: { cursor: null, numItems: 40 },
    })

    return {
      thread: {
        threadId: thread.threadId,
        title: thread.title ?? 'Conversation',
        lastMessageAt: thread.lastMessageAt,
        createdAt: thread.createdAt,
        userName: user?.name,
        userEmail: user?.email ?? thread.userId,
      },
      messages: paginated.page.map((message, index) => ({
        key: (message as any)._id ?? (message as any).key ?? `${index}`,
        role: (message as any).role ?? 'assistant',
        preview: previewFromMessage(message),
      })),
      events: events
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((event) => ({
          _id: event._id,
          type: event.type,
          level: event.level,
          message: event.message,
          tool: event.tool,
          createdAt: event.createdAt,
          metadata: parseJsonObject(event.metadata),
        })),
      actions: actions
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((action) => ({
          _id: action._id,
          tool: action.tool,
          summary: action.summary,
          entityType: action.entityType,
          entityId: action.entityId,
          createdAt: action.createdAt,
        })),
    }
  },
})

const planValidator = v.union(
  v.literal('free'),
  v.literal('pro'),
  v.literal('pro_ai'),
  v.literal('copilot'),
  v.literal('copilot_max'),
)

/** MRR mensuel équivalent d'un user (0 si free/expiré ; annuel ramené au mois). */
function mrrXofOf(u: Doc<'users'>): number {
  const plan: Plan = u.plan ?? 'free'
  if (!PAID_PLANS.includes(plan as PaidPlan)) return 0
  if (u.planRenewsAt !== undefined && u.planRenewsAt < Date.now()) return 0
  const price = PRICING[plan as PaidPlan]
  return u.planInterval === 'annual'
    ? Math.round(price.annual / 12)
    : price.monthly
}

/**
 * Vue 360 d'UN compte (cross-tenant, réservé admin) : agrège profil, abonnement,
 * activité produit, IA, veille et feedbacks récents pour un `userId` (= authId).
 * Chaque sous-requête est scopée `by_user*` — pas de scan global.
 */
export const userDetail = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    // La liste passe l'_id du doc `users` ; on résout le compte par cet id, puis
    // on scope toutes les sous-requêtes avec son `authId` (= valeur de userId
    // portée par les tables métier). ConvexError si introuvable (message visible).
    const user = await ctx.db.get(args.userId as Id<'users'>)
    if (!user) throw forbiddenError('Compte introuvable.')
    const userId = user.authId

    const [
      opportunities,
      savedSearches,
      proposals,
      companies,
      contacts,
      followups,
      documents,
      credits,
      threads,
      actions,
      feedbacks,
    ] = await Promise.all([
      ctx.db
        .query('opportunities')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('savedSearches')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('proposals')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('companies')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('contacts')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('followups')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('documents')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('aiCredits')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        // `.first()` (pas `.unique()`) : certains comptes ont un doublon de ligne
        // crédits (artefact de migration) qui ferait throw `.unique()` -> 500.
        .first(),
      ctx.db
        .query('aiThreads')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('aiActions')
        .withIndex('by_user_created', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('feedback')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
    ])

    // Opportunités par stade (toutes les clés présentes pour des mini-barres).
    const opportunitiesByStage: Record<Doc<'opportunities'>['stage'], number> =
      {
        lead: 0,
        contacted: 0,
        applied: 0,
        interview: 0,
        negotiation: 0,
        won: 0,
        lost: 0,
      }
    let lastActivityAt = user.createdAt
    let captures = 0
    for (const o of opportunities) {
      opportunitiesByStage[o.stage] += 1
      const t = Math.max(o.updatedAt, o.createdAt)
      if (t > lastActivityAt) lastActivityAt = t
      if (o.tags.includes('veille')) captures += 1
    }

    // Propositions par statut.
    const proposalsByStatus: Record<Doc<'proposals'>['status'], number> = {
      draft: 0,
      sent: 0,
      accepted: 0,
      refused: 0,
    }
    for (const p of proposals) proposalsByStatus[p.status] += 1

    // Crédits IA consommés sur le mois calendaire courant (scopé user).
    const monthStart = startOfMonth()
    let usedThisMonth = 0
    const usageMonth = await ctx.db
      .query('aiUsage')
      .withIndex('by_user_created', (q) =>
        q.eq('userId', userId).gte('createdAt', monthStart),
      )
      .collect()
    for (const row of usageMonth) usedThisMonth += row.creditsDebited

    for (const a of actions) if (a.createdAt > lastActivityAt) lastActivityAt = a.createdAt

    const recentFeedbacks = [...feedbacks]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((f) => ({
        type: f.type,
        message: f.message,
        status: f.status,
        createdAt: f.createdAt,
      }))

    const profile: {
      name?: string
      email: string
      image?: string
      role?: 'admin'
      plan: Plan
      suspended: boolean
      createdAt: number
    } = {
      email: user.email,
      plan: user.plan ?? 'free',
      suspended: user.suspended ?? false,
      createdAt: user.createdAt,
    }
    if (user.name) profile.name = user.name
    if (user.image) profile.image = user.image
    if (user.role === 'admin') profile.role = 'admin'

    const abonnement: {
      plan: Plan
      planInterval?: Doc<'users'>['planInterval']
      planRenewsAt?: number
      autoRenew: boolean
      cardLast4?: string
      cardBrand?: string
      mrrXof: number
    } = {
      plan: user.plan ?? 'free',
      autoRenew: user.autoRenew ?? true,
      mrrXof: mrrXofOf(user),
    }
    if (user.planInterval) abonnement.planInterval = user.planInterval
    if (user.planRenewsAt !== undefined) abonnement.planRenewsAt = user.planRenewsAt
    if (user.cardLast4) abonnement.cardLast4 = user.cardLast4
    if (user.cardBrand) abonnement.cardBrand = user.cardBrand

    return {
      userId,
      profile,
      abonnement,
      activite: {
        opportunitiesByStage,
        opportunitiesTotal: opportunities.length,
        veilles: {
          total: savedSearches.length,
          enabled: savedSearches.filter((s) => s.enabled).length,
        },
        proposals: { total: proposals.length, byStatus: proposalsByStatus },
        companies: companies.length,
        contacts: contacts.length,
        followups: {
          total: followups.length,
          open: followups.filter((f) => !f.done).length,
        },
        documents: documents.length,
      },
      ia: {
        balance: credits?.balance ?? 0,
        packBalance: credits?.packBalance ?? 0,
        allowance: credits?.monthlyAllowance ?? 0,
        usedThisMonth,
        threads: threads.length,
        actions: actions.length,
      },
      veille: { captures },
      feedbacks: { total: feedbacks.length, items: recentFeedbacks },
      lastActivityAt,
    }
  },
})

/** Change le palier d'abonnement d'un compte. Réservé admin. */
export const setUserPlan = mutation({
  args: { userId: v.string(), plan: planValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const user = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', args.userId))
      .unique()
    if (!user) throw notFoundError('Compte introuvable.')
    await ctx.db.patch(user._id, { plan: args.plan })
    return { ok: true as const }
  },
})

/**
 * Accorde ou retire le rôle administrateur. EMPÊCHE l'admin courant de se retirer
 * son propre rôle (pour ne pas se verrouiller dehors). Réservé admin.
 */
export const setUserRole = mutation({
  args: { userId: v.string(), role: v.union(v.literal('admin'), v.null()) },
  handler: async (ctx, args) => {
    const me = await requireAdmin(ctx)
    if (args.role === null && args.userId === me.userId) {
      throw forbiddenError('Vous ne pouvez pas retirer votre propre rôle admin.')
    }
    const user = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', args.userId))
      .unique()
    if (!user) throw notFoundError('Compte introuvable.')
    await ctx.db.patch(user._id, {
      role: args.role === 'admin' ? 'admin' : undefined,
    })
    return { ok: true as const }
  },
})

/** Suspend ou réactive un compte (flag seul). Réservé admin. */
export const setUserSuspended = mutation({
  args: { userId: v.string(), suspended: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const user = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', args.userId))
      .unique()
    if (!user) throw notFoundError('Compte introuvable.')
    await ctx.db.patch(user._id, { suspended: args.suspended })
    return { ok: true as const }
  },
})

/** Une transaction Paystack normalisée (sérialisable) pour le back-office. */
export type PaystackTransaction = {
  id: number
  amount: number
  currency: string
  status: string
  reference: string
  channel: string | null
  paidAt: string | null
  email: string | null
}

/**
 * Liste les transactions reçues via Paystack (récentes d'abord). C'est une
 * ACTION (appel HTTP externe) : pas de `ctx.db`, donc le gating admin passe par
 * la query publique `amIAdmin` exécutée via `ctx.runQuery`. La clé secrète vit
 * dans `process.env.PAYSTACK_SECRET_KEY`. Montants ramenés en XOF (Paystack les
 * expose en sous-unité, ×100).
 */
export const paystackTransactions = action({
  args: { perPage: v.optional(v.number()) },
  handler: async (ctx, args): Promise<PaystackTransaction[]> => {
    const ok = await ctx.runQuery(api.admin.amIAdmin, {})
    if (!ok) throw forbiddenError()

    const key = process.env.PAYSTACK_SECRET_KEY
    if (!key) throw validationError('Paystack non configuré.')

    const perPage = args.perPage ?? 50
    const res = await fetch(
      `https://api.paystack.co/transaction?perPage=${perPage}`,
      { headers: { Authorization: `Bearer ${key}` } },
    )
    const json = (await res.json()) as {
      status: boolean
      message: string
      data?: Array<{
        id: number
        amount: number
        currency: string
        status: string
        reference: string
        channel?: string | null
        paid_at?: string | null
        customer?: { email?: string | null } | null
      }>
    }
    if (!json.status) throw validationError(json.message)

    const rows: PaystackTransaction[] = (json.data ?? []).map((t) => ({
      id: t.id,
      amount: t.amount / 100,
      currency: t.currency,
      status: t.status,
      reference: t.reference,
      channel: t.channel ?? null,
      paidAt: t.paid_at ?? null,
      email: t.customer?.email ?? null,
    }))
    rows.sort((a, b) => {
      const ta = a.paidAt ? Date.parse(a.paidAt) : 0
      const tb = b.paidAt ? Date.parse(b.paidAt) : 0
      return tb - ta
    })
    return rows
  },
})
