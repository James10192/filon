import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  query,
  mutation,
} from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser } from './lib/withUser'
import { assistantKindValidator } from './lib/assistant'

const memoryCategoryValidator = v.union(
  v.literal('preference'),
  v.literal('activity'),
  v.literal('goal'),
  v.literal('organization'),
  v.literal('commercial_posture'),
  v.literal('support_signal'),
)

const memorySourceValidator = v.union(v.literal('manual'), v.literal('auto'))
const memoryScopeValidator = v.union(v.literal('user'), v.literal('organization'))
const memoryRunSourceValidator = v.union(
  v.literal('chat'),
  v.literal('support'),
  v.literal('feedback'),
  v.literal('product_usage'),
)

function tokenize(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((part) => part.length >= 3),
    ),
  )
}

function scoreKeywords(haystack: string[], needle: string[]): number {
  if (needle.length === 0) return 0
  let score = 0
  for (const token of needle) {
    if (haystack.includes(token)) score += 1
  }
  return score
}

export const upsertMemory = mutation({
  args: {
    scope: memoryScopeValidator,
    category: memoryCategoryValidator,
    key: v.string(),
    value: v.string(),
    source: memorySourceValidator,
    assistantKind: v.optional(assistantKindValidator),
    organizationId: v.optional(v.string()),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const key = args.key.trim().toLowerCase()
    const value = args.value.trim()
    if (!key || !value) {
      throw new Error('Mémoire invalide.')
    }

    const existing = await ctx.db
      .query('aiMemories')
      .withIndex('by_user_key', (q) => q.eq('userId', userId).eq('key', key))
      .unique()

    if (existing?.source === 'manual' && args.source === 'auto') {
      return { skipped: true as const, reason: 'manual_wins' as const }
    }

    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        scope: args.scope,
        category: args.category,
        value,
        source: args.source,
        ...(args.assistantKind ? { assistantKind: args.assistantKind } : {}),
        ...(args.organizationId ? { organizationId: args.organizationId } : {}),
        ...(args.confidence !== undefined ? { confidence: args.confidence } : {}),
        updatedAt: now,
      })
      return { skipped: false as const, id: existing._id }
    }

    const id = await ctx.db.insert('aiMemories', {
      userId,
      scope: args.scope,
      category: args.category,
      key,
      value,
      source: args.source,
      ...(args.assistantKind ? { assistantKind: args.assistantKind } : {}),
      ...(args.organizationId ? { organizationId: args.organizationId } : {}),
      ...(args.confidence !== undefined ? { confidence: args.confidence } : {}),
      createdAt: now,
      updatedAt: now,
    })
    return { skipped: false as const, id }
  },
})

export const listMemories = query({
  args: { assistantKind: v.optional(assistantKindValidator) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const memories = await ctx.db
      .query('aiMemories')
      .withIndex('by_user_scope', (q) => q.eq('userId', userId).eq('scope', 'user'))
      .collect()
    return memories
      .filter((memory) =>
        args.assistantKind ? memory.assistantKind === args.assistantKind : true,
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

export const recordConversationMemory = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.optional(v.string()),
    assistantKind: assistantKindValidator,
    scope: memoryScopeValidator,
    summary: v.string(),
    source: memoryRunSourceValidator,
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const summary = args.summary.trim()
    const now = Date.now()
    const keywords = tokenize(summary).slice(0, 12)
    await ctx.db.insert('conversationMemory', {
      userId: args.userId,
      ...(args.threadId ? { threadId: args.threadId } : {}),
      ...(args.organizationId ? { organizationId: args.organizationId } : {}),
      assistantKind: args.assistantKind,
      scope: args.scope,
      summary,
      keywords,
      embeddingStatus: 'unavailable',
      source: args.source,
      createdAt: now,
    })
    await ctx.db.insert('memoryExtractionRuns', {
      userId: args.userId,
      ...(args.threadId ? { threadId: args.threadId } : {}),
      source: args.source,
      status: 'completed',
      summary,
      createdAt: now,
    })
    return null
  },
})

export const recallContext = query({
  args: {
    query: v.string(),
    assistantKind: assistantKindValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const tokens = tokenize(args.query)
    const limit = args.limit ?? 5

    const [memories, conversation] = await Promise.all([
      ctx.db
        .query('aiMemories')
        .withIndex('by_user_scope', (q) => q.eq('userId', userId).eq('scope', 'user'))
        .collect(),
      ctx.db
        .query('conversationMemory')
        .withIndex('by_user_created', (q) => q.eq('userId', userId))
        .order('desc')
        .take(30),
    ])

    const durable = memories
      .filter((memory) =>
        memory.assistantKind ? memory.assistantKind === args.assistantKind : true,
      )
      .map((memory) => ({
        kind: 'durable' as const,
        score: scoreKeywords(tokenize(`${memory.key} ${memory.value}`), tokens),
        value: memory.value,
        key: memory.key,
        category: memory.category,
        source: memory.source,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)

    const semantic = conversation
      .filter((item) => item.assistantKind === args.assistantKind)
      .map((item) => ({
        kind: 'semantic' as const,
        score: scoreKeywords(item.keywords, tokens),
        summary: item.summary,
        createdAt: item.createdAt,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)

    return {
      durable: durable.slice(0, limit),
      semantic: semantic.slice(0, limit),
      degraded: true,
    }
  },
})

export const recallContextForUser = internalQuery({
  args: {
    userId: v.string(),
    query: v.string(),
    assistantKind: assistantKindValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tokens = tokenize(args.query)
    const limit = args.limit ?? 5

    const [memories, conversation] = await Promise.all([
      ctx.db
        .query('aiMemories')
        .withIndex('by_user_scope', (q) => q.eq('userId', args.userId).eq('scope', 'user'))
        .collect(),
      ctx.db
        .query('conversationMemory')
        .withIndex('by_user_created', (q) => q.eq('userId', args.userId))
        .order('desc')
        .take(30),
    ])

    const durable = memories
      .filter((memory) =>
        memory.assistantKind ? memory.assistantKind === args.assistantKind : true,
      )
      .map((memory) => ({
        kind: 'durable' as const,
        score: scoreKeywords(tokenize(`${memory.key} ${memory.value}`), tokens),
        value: memory.value,
        key: memory.key,
        category: memory.category,
        source: memory.source,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)

    const semantic = conversation
      .filter((item) => item.assistantKind === args.assistantKind)
      .map((item) => ({
        kind: 'semantic' as const,
        score: scoreKeywords(item.keywords, tokens),
        summary: item.summary,
        createdAt: item.createdAt,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)

    return {
      durable: durable.slice(0, limit),
      semantic: semantic.slice(0, limit),
      degraded: true,
    }
  },
})
