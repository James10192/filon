import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import {
  requireAdmin,
  requireUser,
  type MutationCtx,
  type QueryCtx,
} from './lib/withUser'
import { createNotification } from './notifications'
import { notFoundError, forbiddenError, validationError } from './lib/plan'
import { assistantKindValidator, type AssistantKind } from './lib/assistant'

const supportStatusValidator = v.union(
  v.literal('pending'),
  v.literal('active'),
  v.literal('released'),
  v.literal('dismissed'),
)

const priorityValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
)

const STALE_AFTER_MS = 5 * 60 * 1000

type SupportThreadDoc = Doc<'supportThreads'>

async function actorName(ctx: QueryCtx | MutationCtx, userId: string) {
  const doc = await ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', userId))
    .unique()
  return doc?.name?.trim() || doc?.email || 'Agent Filon'
}

async function latestThreadForAiThread(
  ctx: QueryCtx | MutationCtx,
  aiThreadId: string,
): Promise<SupportThreadDoc | null> {
  const rows = await ctx.db
    .query('supportThreads')
    .withIndex('by_ai_thread', (q) => q.eq('aiThreadId', aiThreadId))
    .collect()
  return rows.sort((a, b) => b.requestedAt - a.requestedAt)[0] ?? null
}

async function insertSystemMessage(
  ctx: MutationCtx,
  thread: SupportThreadDoc,
  body: string,
): Promise<void> {
  await ctx.db.insert('supportMessages', {
    userId: thread.userId,
    supportThreadId: thread._id,
    ...(thread.aiThreadId ? { aiThreadId: thread.aiThreadId } : {}),
    role: 'system',
    via: 'human',
    body,
    createdAt: Date.now(),
  })
}

async function patchActivity(
  ctx: MutationCtx,
  threadId: Id<'supportThreads'>,
  patch: Partial<SupportThreadDoc>,
): Promise<void> {
  await ctx.db.patch(threadId, {
    ...patch,
    lastActivityAt: Date.now(),
  })
}

function isOpenStatus(status: SupportThreadDoc['status']) {
  return status === 'pending' || status === 'active'
}

export const requestHandoff = mutation({
  args: {
    aiThreadId: v.string(),
    assistantKind: assistantKindValidator,
    reason: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const existing = await latestThreadForAiThread(ctx, args.aiThreadId)
    if (existing && existing.userId === userId && isOpenStatus(existing.status)) {
      return { supportThreadId: existing._id, status: existing.status }
    }

    const now = Date.now()
    const reason = args.reason?.trim()
    const category = args.category?.trim()
    const supportThreadId = await ctx.db.insert('supportThreads', {
      userId,
      aiThreadId: args.aiThreadId,
      assistantKind: args.assistantKind,
      status: 'pending',
      priority: args.priority ?? 'medium',
      ...(reason ? { requestedReason: reason } : {}),
      ...(category ? { category } : {}),
      lastActivityAt: now,
      requestedAt: now,
    })
    const thread = await ctx.db.get(supportThreadId)
    if (!thread) throw notFoundError('Relais support introuvable.')
    await insertSystemMessage(
      ctx,
      thread,
      reason
        ? `Relais humain demandé : ${reason}`
        : 'Relais humain demandé',
    )
    return { supportThreadId, status: 'pending' as const }
  },
})

export const supportThreadState = query({
  args: { aiThreadId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const thread = await latestThreadForAiThread(ctx, args.aiThreadId)
    if (!thread || thread.userId !== userId) return null
    return thread
  },
})

export const supportLiveThread = query({
  args: { aiThreadId: v.string() },
  handler: async (ctx, args) => {
    const authUser = await requireUser(ctx)
    const thread = await latestThreadForAiThread(ctx, args.aiThreadId)
    if (!thread || thread.userId !== authUser.userId) return null
    const messages = await ctx.db
      .query('supportMessages')
      .withIndex('by_supportThread', (q) => q.eq('supportThreadId', thread._id))
      .collect()
    return {
      thread,
      messages: messages.sort((a, b) => a.createdAt - b.createdAt),
    }
  },
})

export const supportUserSend = mutation({
  args: {
    supportThreadId: v.id('supportThreads'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const thread = await ctx.db.get(args.supportThreadId)
    if (!thread || thread.userId !== userId) throw notFoundError('Support introuvable.')
    if (!isOpenStatus(thread.status)) {
      throw validationError('Le relais humain est déjà clôturé.')
    }
    const body = args.body.trim()
    if (!body) throw validationError('Le message ne peut pas être vide.')
    const now = Date.now()
    await ctx.db.insert('supportMessages', {
      userId,
      supportThreadId: thread._id,
      ...(thread.aiThreadId ? { aiThreadId: thread.aiThreadId } : {}),
      role: 'user',
      via: 'human',
      body,
      createdAt: now,
    })
    await ctx.db.patch(thread._id, {
      lastUserMessageAt: now,
      lastActivityAt: now,
    })
    return { ok: true as const }
  },
})

export const supportInbox = query({
  args: { status: v.optional(supportStatusValidator) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const rows = args.status
      ? await ctx.db
          .query('supportThreads')
          .withIndex('by_status_requested', (q) => q.eq('status', args.status!))
          .order('desc')
          .collect()
      : await ctx.db
          .query('supportThreads')
          .withIndex('by_status_requested', (q) => q.eq('status', 'pending'))
          .order('desc')
          .take(50)
    return Promise.all(
      rows.map(async (thread) => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_authId', (q) => q.eq('authId', thread.userId))
          .unique()
        const messages = await ctx.db
          .query('supportMessages')
          .withIndex('by_supportThread', (q) => q.eq('supportThreadId', thread._id))
          .collect()
        const lastMessage = messages.sort((a, b) => b.createdAt - a.createdAt)[0]
        return {
          thread,
          user: {
            name: user?.name,
            email: user?.email ?? thread.userId,
          },
          preview: lastMessage?.body ?? thread.requestedReason ?? 'Aucun message',
        }
      }),
    )
  },
})

export const supportAdminThread = query({
  args: { supportThreadId: v.id('supportThreads') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const thread = await ctx.db.get(args.supportThreadId)
    if (!thread) throw notFoundError('Support introuvable.')
    const user = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', thread.userId))
      .unique()
    const messages = await ctx.db
      .query('supportMessages')
      .withIndex('by_supportThread', (q) => q.eq('supportThreadId', thread._id))
      .collect()
    return {
      thread,
      user: {
        name: user?.name,
        email: user?.email ?? thread.userId,
      },
      messages: messages.sort((a, b) => a.createdAt - b.createdAt),
    }
  },
})

export const supportTakeOver = mutation({
  args: { supportThreadId: v.id('supportThreads') },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx)
    const thread = await ctx.db.get(args.supportThreadId)
    if (!thread) throw notFoundError('Support introuvable.')
    const name = await actorName(ctx, userId)
    const now = Date.now()
    await ctx.db.insert('supportPresence', {
      supportThreadId: thread._id,
      agentUserId: userId,
      lastSeenAt: now,
    })
    await ctx.db.patch(thread._id, {
      status: 'active',
      assignedAgentId: userId,
      assignedAgentName: name,
      takenOverAt: now,
      lastActivityAt: now,
    })
    await insertSystemMessage(ctx, thread, `Relais humain : ${name} a rejoint la conversation`)
    await createNotification(ctx, {
      userId: thread.userId,
      kind: 'product_update',
      title: 'Support humain actif',
      body: `${name} a rejoint votre conversation.`,
      ...(thread.aiThreadId ? { actionUrl: '/app/copilot', actionLabel: 'Ouvrir le support' } : {}),
    })
    return { ok: true as const }
  },
})

export const supportHeartbeat = mutation({
  args: { supportThreadId: v.id('supportThreads') },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx)
    const thread = await ctx.db.get(args.supportThreadId)
    if (!thread) throw notFoundError('Support introuvable.')
    const rows = await ctx.db
      .query('supportPresence')
      .withIndex('by_support_agent', (q) =>
        q.eq('supportThreadId', thread._id).eq('agentUserId', userId),
      )
      .collect()
    const row = rows[0]
    if (row) {
      await ctx.db.patch(row._id, { lastSeenAt: Date.now() })
    } else {
      await ctx.db.insert('supportPresence', {
        supportThreadId: thread._id,
        agentUserId: userId,
        lastSeenAt: Date.now(),
      })
    }
    return { ok: true as const }
  },
})

export const supportAgentSend = mutation({
  args: {
    supportThreadId: v.id('supportThreads'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx)
    const thread = await ctx.db.get(args.supportThreadId)
    if (!thread) throw notFoundError('Support introuvable.')
    if (!isOpenStatus(thread.status)) throw validationError('Le fil est fermé.')
    if (thread.assignedAgentId && thread.assignedAgentId !== userId) {
      throw forbiddenError('Ce fil est déjà pris par un autre agent.')
    }
    const body = args.body.trim()
    if (!body) throw validationError('Le message ne peut pas être vide.')
    const name = await actorName(ctx, userId)
    const now = Date.now()
    await ctx.db.insert('supportMessages', {
      userId: thread.userId,
      supportThreadId: thread._id,
      ...(thread.aiThreadId ? { aiThreadId: thread.aiThreadId } : {}),
      role: 'agent',
      via: 'human',
      body,
      actorUserId: userId,
      actorName: name,
      createdAt: now,
    })
    await ctx.db.patch(thread._id, {
      status: 'active',
      assignedAgentId: userId,
      assignedAgentName: name,
      lastAgentMessageAt: now,
      lastActivityAt: now,
    })
    return { ok: true as const }
  },
})

export const supportRelease = mutation({
  args: {
    supportThreadId: v.id('supportThreads'),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx)
    const thread = await ctx.db.get(args.supportThreadId)
    if (!thread) throw notFoundError('Support introuvable.')
    if (thread.assignedAgentId && thread.assignedAgentId !== userId) {
      throw forbiddenError('Seul l’agent assigné peut rendre la main.')
    }
    const note = args.note?.trim()
    await patchActivity(ctx, thread._id, {
      status: 'released',
      releasedAt: Date.now(),
    })
    await insertSystemMessage(
      ctx,
      thread,
      note ? `Reprise par l’assistant : ${note}` : 'Reprise par l’assistant',
    )
    await createNotification(ctx, {
      userId: thread.userId,
      kind: 'product_update',
      title: 'Reprise par l’assistant',
      body: note
        ? `Le relais humain a rendu la main. Note : ${note}`
        : 'Le relais humain a rendu la main à l’assistant.',
      ...(thread.aiThreadId ? { actionUrl: '/app/copilot', actionLabel: 'Continuer' } : {}),
    })
    return { ok: true as const }
  },
})

export const supportDismiss = mutation({
  args: {
    supportThreadId: v.id('supportThreads'),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const thread = await ctx.db.get(args.supportThreadId)
    if (!thread) throw notFoundError('Support introuvable.')
    const note = args.note?.trim()
    await patchActivity(ctx, thread._id, { status: 'dismissed' })
    await insertSystemMessage(
      ctx,
      thread,
      note
        ? `Demande de relais clôturée : ${note}`
        : 'Demande de relais clôturée',
    )
    return { ok: true as const }
  },
})

async function autoReleaseStaleThreads(ctx: MutationCtx): Promise<number> {
  const active = await ctx.db
    .query('supportThreads')
    .withIndex('by_status_requested', (q) => q.eq('status', 'active'))
    .collect()
  let released = 0
  for (const thread of active) {
    const presence = await ctx.db
      .query('supportPresence')
      .withIndex('by_support_agent', (q) =>
        q.eq('supportThreadId', thread._id).eq('agentUserId', thread.assignedAgentId ?? ''),
      )
      .collect()
    const lastSeen = presence[0]?.lastSeenAt ?? thread.lastAgentMessageAt ?? thread.takenOverAt
    if (!lastSeen) continue
    if (Date.now() - lastSeen < STALE_AFTER_MS) continue
    await ctx.db.patch(thread._id, {
      status: 'released',
      releasedAt: Date.now(),
      lastActivityAt: Date.now(),
    })
    await insertSystemMessage(
      ctx,
      thread,
      'Reprise par l’assistant, relais humain expiré par inactivité',
    )
    released += 1
  }
  return released
}

export const supportAutoReleaseStale = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const released = await autoReleaseStaleThreads(ctx)
    return { released }
  },
})

export const autoReleaseStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const released = await autoReleaseStaleThreads(ctx)
    return { released }
  },
})
