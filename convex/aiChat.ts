import { v } from 'convex/values'
import { paginationOptsValidator, type PaginationResult } from 'convex/server'
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import {
  requireUser,
  requireUserFromAction,
  requireCopilot,
} from './lib/withUser'
import {
  forbiddenError,
  notFoundError,
  allowsQualityModel,
  planLimitError,
} from './lib/plan'
import { creditsForUsage } from './lib/credits'
import { readCreditState, ensureAiBudget, type AiBudget } from './lib/aiGate'
import { decryptSecret } from './lib/crypto'
import type { MessageDoc } from '@convex-dev/agent'
import { vStreamArgs } from '@convex-dev/agent/validators'
import { copilot } from './agent/agent'
import { tools } from './agent/tools'
import { toolsFor, stopWhenFor } from './agent/gating'
import { modelFor, MODELS, type AiMode } from './agent/models'
import { assistantKindValidator } from './lib/assistant'
import { buildSystemPrompt, allowsCoach } from './lib/aiChatRuntime'
import { looksLikePipelineRequest } from './lib/copilotRouting'

const modeValidator = v.union(v.literal('fast'), v.literal('quality'))

export const aiGate = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<AiBudget> => {
    const plan = await requireCopilot(ctx, userId)
    return readCreditState(ctx, userId, plan)
  },
})

export const recordThread = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    assistantKind: assistantKindValidator,
    title: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const now = Date.now()
    const doc: Record<string, unknown> = {
      userId: args.userId,
      threadId: args.threadId,
      assistantKind: args.assistantKind,
      lastMessageAt: now,
      createdAt: now,
    }
    if (args.title !== undefined) doc.title = args.title
    await ctx.db.insert(
      'aiThreads',
      doc as Omit<Doc<'aiThreads'>, '_id' | '_creationTime'>,
    )
    return null
  },
})

const TOOL_TITLE: Record<string, string> = {
  summarize_pipeline: 'Analyse du pipeline',
  pipeline_stats: 'Analyse du pipeline',
  list_opportunities: "Recherche d'opportunites",
  search_opportunities: "Recherche d'opportunites",
  list_proposals: 'Revue des propositions',
  get_proposal_detail: 'Revue des propositions',
  due_followups: 'Relances a faire',
  find_company: 'Recherche carnet',
  find_contact: 'Recherche carnet',
  create_opportunity: 'Nouvelle opportunite',
  schedule_followup: 'Relance planifiee',
  update_opportunity_stage: 'Mise a jour du pipeline',
  draft_application: 'Brouillon de candidature',
  add_activity: 'Note ajoutee',
}

function deriveTitle(toolsUsed: string[], prompt: string): string {
  for (const toolName of toolsUsed) {
    if (TOOL_TITLE[toolName]) return TOOL_TITLE[toolName]
  }
  const clean = prompt.trim().replace(/\s+/g, ' ')
  if (!clean) return 'Conversation'
  return clean.length > 48 ? `${clean.slice(0, 48)}...` : clean
}

export const bumpThread = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    assistantKind: v.optional(assistantKindValidator),
    toolsUsed: v.optional(v.array(v.string())),
    prompt: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, threadId, assistantKind, toolsUsed, prompt },
  ): Promise<null> => {
    const doc = await ctx.db
      .query('aiThreads')
      .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
      .unique()
    if (!doc || doc.userId !== userId) return null

    const patch: Record<string, unknown> = { lastMessageAt: Date.now() }
    if (assistantKind !== undefined && doc.assistantKind !== assistantKind) {
      patch.assistantKind = assistantKind
    }
    if (!doc.title && prompt !== undefined) {
      patch.title = deriveTitle(toolsUsed ?? [], prompt)
    }
    await ctx.db.patch(doc._id, patch)
    return null
  },
})

export const logAction = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.optional(v.string()),
    tool: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    summary: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const doc: Record<string, unknown> = {
      userId: args.userId,
      tool: args.tool,
      summary: args.summary,
      createdAt: Date.now(),
    }
    if (args.threadId !== undefined) doc.threadId = args.threadId
    if (args.entityType !== undefined) doc.entityType = args.entityType
    if (args.entityId !== undefined) doc.entityId = args.entityId
    await ctx.db.insert(
      'aiActions',
      doc as Omit<Doc<'aiActions'>, '_id' | '_creationTime'>,
    )
    return null
  },
})

export const logEvent = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.optional(v.string()),
    assistantKind: v.optional(assistantKindValidator),
    type: v.string(),
    level: v.union(v.literal('info'), v.literal('warning'), v.literal('error')),
    message: v.string(),
    tool: v.optional(v.string()),
    model: v.optional(v.string()),
    mode: v.optional(modeValidator),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const doc: Record<string, unknown> = {
      userId: args.userId,
      type: args.type,
      level: args.level,
      message: args.message,
      createdAt: Date.now(),
    }
    if (args.threadId !== undefined) doc.threadId = args.threadId
    if (args.assistantKind !== undefined) doc.assistantKind = args.assistantKind
    if (args.tool !== undefined) doc.tool = args.tool
    if (args.model !== undefined) doc.model = args.model
    if (args.mode !== undefined) doc.mode = args.mode
    if (args.metadata !== undefined) doc.metadata = args.metadata
    await ctx.db.insert(
      'aiEvents',
      doc as Omit<Doc<'aiEvents'>, '_id' | '_creationTime'>,
    )
    return null
  },
})

export const listActions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }): Promise<Doc<'aiActions'>[]> => {
    const { userId } = await requireUser(ctx)
    return ctx.db
      .query('aiActions')
      .withIndex('by_user_created', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit ?? 100)
  },
})

export const listEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }): Promise<Doc<'aiEvents'>[]> => {
    const { userId } = await requireUser(ctx)
    return ctx.db
      .query('aiEvents')
      .withIndex('by_user_created', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit ?? 100)
  },
})

export const renameThread = mutation({
  args: { threadId: v.string(), title: v.string() },
  handler: async (ctx, { threadId, title }): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await ctx.db
      .query('aiThreads')
      .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
      .unique()
    if (!doc || doc.userId !== userId) throw notFoundError('Introuvable')
    const clean = title.trim().slice(0, 80)
    if (clean) await ctx.db.patch(doc._id, { title: clean })
    return null
  },
})

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    assistantKind: v.optional(assistantKindValidator),
  },
  handler: async (ctx, args): Promise<{ threadId: string }> => {
    const { userId } = await requireUser(ctx)
    await requireCopilot(ctx, userId)
    await ctx.runMutation(internal.aiCredits.ensureCredits, { userId })
    const assistantKind = args.assistantKind ?? 'pipeline'

    const { threadId } = await copilot.createThread(ctx, {
      userId,
      ...(args.title !== undefined ? { title: args.title } : {}),
    })
    await ctx.runMutation(internal.aiChat.recordThread, {
      userId,
      threadId,
      assistantKind,
      ...(args.title !== undefined ? { title: args.title } : {}),
    })
    return { threadId }
  },
})

export const listThreads = query({
  args: { assistantKind: v.optional(assistantKindValidator) },
  handler: async (ctx, args): Promise<Doc<'aiThreads'>[]> => {
    const { userId } = await requireUser(ctx)
    const rows = await ctx.db
      .query('aiThreads')
      .withIndex('by_user_last', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
    return args.assistantKind
      ? rows.filter((row) => row.assistantKind === args.assistantKind)
      : rows
  },
})

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: v.optional(vStreamArgs),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const mirror = await ctx.db
      .query('aiThreads')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .unique()
    if (!mirror || mirror.userId !== userId) throw forbiddenError('Non autorise')

    const paginated: PaginationResult<MessageDoc> = await copilot.listMessages(
      ctx,
      {
        threadId: args.threadId,
        paginationOpts: args.paginationOpts,
      },
    )
    const streams = await copilot.syncStreams(ctx, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    })
    return { ...paginated, streams }
  },
})

export const threadMirror = internalQuery({
  args: { userId: v.string(), threadId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query('aiThreads')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .unique()
    if (!doc || doc.userId !== args.userId) return null
    return doc
  },
})

function stringifyMetadata(value: Record<string, unknown>): string {
  return JSON.stringify(value)
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Erreur IA inconnue'
}

function supportRedirectText(): string {
  return [
    'Cette demande concerne votre pipeline commercial, pas le support produit.',
    'Passez en mode Pipeline pour analyser la proposition, les destinataires et les relances avec vos données Filon.',
    'Le relais humain reste réservé au support produit.',
  ].join(' ')
}

export const sendMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    mode: v.optional(modeValidator),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const { userId } = await requireUserFromAction(ctx)
    const requested: AiMode = args.mode ?? 'fast'
    const mirror = await ctx.runQuery(internal.aiChat.threadMirror, {
      userId,
      threadId: args.threadId,
    })
    if (!mirror) throw forbiddenError('Conversation introuvable')
    const assistantKind = mirror.assistantKind ?? 'pipeline'

    if (
      assistantKind === 'support' &&
      looksLikePipelineRequest(args.prompt)
    ) {
      const redirect = supportRedirectText()
      await Promise.all([
        copilot.saveMessages(ctx, {
          threadId: args.threadId,
          userId,
          messages: [
            { role: 'user', content: args.prompt },
            { role: 'assistant', content: redirect },
          ],
        }),
        ctx.runMutation(internal.aiChat.bumpThread, {
          userId,
          threadId: args.threadId,
          assistantKind,
          prompt: args.prompt,
        }),
        ctx.runMutation(internal.aiChat.logEvent, {
          userId,
          threadId: args.threadId,
          assistantKind,
          type: 'message_redirected',
          level: 'info',
          message: 'Demande support redirigee vers le mode Pipeline',
          mode: 'fast',
          metadata: stringifyMetadata({
            promptPreview: args.prompt.slice(0, 180),
          }),
        }),
      ])
      return { ok: true }
    }

    const gate = await ctx.runQuery(internal.aiChat.aiGate, { userId })
    if (assistantKind === 'coach' && !allowsCoach(gate.plan)) {
      throw planLimitError(
        'Le coach marketing IA est reserve aux plans Copilot.',
      )
    }

    let byokKey: string | null = null
    const byok = await ctx.runQuery(internal.byok.resolve, { userId })
    if (byok.eligible && byok.ciphertext && byok.provider) {
      try {
        byokKey = await decryptSecret(byok.ciphertext, userId, byok.provider)
      } catch {
        byokKey = null
      }
    }
    if (!byokKey) ensureAiBudget(gate)

    const mode: AiMode =
      requested === 'quality' && !allowsQualityModel(gate.plan)
        ? 'fast'
        : requested

    await ctx.runMutation(internal.aiChat.logEvent, {
      userId,
      threadId: args.threadId,
      assistantKind,
      type: 'message_started',
      level: 'info',
      message: 'Message envoye au copilote',
      mode,
      metadata: stringifyMetadata({
        promptPreview: args.prompt.slice(0, 180),
        byok: Boolean(byokKey),
      }),
    })

    try {
      const { thread } = await copilot.continueThread(ctx, {
        threadId: args.threadId,
        userId,
      })
      const recall = await ctx.runQuery(internal.memory.recallContextForUser, {
        userId,
        query: args.prompt,
        assistantKind,
        limit: 3,
      })
      const systemPrompt = buildSystemPrompt({
        today: new Date().toISOString().slice(0, 10),
        assistantKind,
        durableLines: recall.durable.map(
          (item: { key: string; value: string }) =>
            `- ${item.key} : ${item.value}`,
        ),
        semanticLines: recall.semantic.map(
          (item: { summary: string }) => `- ${item.summary}`,
        ),
      })

      const orgRole =
        assistantKind === 'support'
          ? null
          : await ctx.runQuery(internal.agent.orgReads.orgRole, {
              userId,
            })
      const result = await thread.streamText(
        {
          prompt: args.prompt,
          system: systemPrompt,
          model: modelFor(mode, gate.plan, byokKey ?? undefined),
          tools:
            assistantKind === 'support'
              ? {}
              : toolsFor(gate.plan, orgRole?.role ?? null, tools),
          stopWhen: stopWhenFor(gate.plan),
        },
        { saveStreamDeltas: true },
      )
      await result.consumeStream()

      const usage = await result.usage
      const toolCalls = await result.toolCalls
      const inputTokens = usage.inputTokens ?? 0
      const outputTokens = usage.outputTokens ?? 0
      const toolsUsed = Array.from(new Set(toolCalls.map((c) => c.toolName)))
      const credits = creditsForUsage(inputTokens, outputTokens, mode)
      const tasks: Promise<unknown>[] = [
        ctx.runMutation(internal.aiChat.bumpThread, {
          userId,
          threadId: args.threadId,
          assistantKind,
          toolsUsed,
          prompt: args.prompt,
        }),
        ctx.runMutation(internal.aiChat.logEvent, {
          userId,
          threadId: args.threadId,
          assistantKind,
          type: 'message_completed',
          level: 'info',
          message: 'Reponse copilote generee',
          model: MODELS[mode],
          mode,
          metadata: stringifyMetadata({
            inputTokens,
            outputTokens,
            toolsUsed,
            credits,
            byok: Boolean(byokKey),
          }),
        }),
        ctx.runMutation(internal.memory.recordConversationMemory, {
          userId,
          threadId: args.threadId,
          assistantKind,
          scope: 'user',
          source: 'chat',
          summary: `${assistantKind}: ${args.prompt.slice(0, 240)}`,
        }),
      ]
      if (!byokKey) {
        tasks.push(
          ctx.runMutation(internal.aiCredits.debit, {
            userId,
            threadId: args.threadId,
            model: MODELS[mode],
            mode,
            inputTokens,
            outputTokens,
            credits,
            toolsUsed,
          }),
        )
      }
      await Promise.all(tasks)
      return { ok: true }
    } catch (error) {
      const message = errorText(error)
      await Promise.all([
        ctx.runMutation(internal.aiChat.logEvent, {
          userId,
          threadId: args.threadId,
          assistantKind,
          type: 'message_failed',
          level: 'error',
          message,
          mode,
          metadata: stringifyMetadata({
            promptPreview: args.prompt.slice(0, 180),
            byok: Boolean(byokKey),
          }),
        }),
        ctx.runMutation(internal.observability.logServerError, {
          userId,
          feature: 'copilot',
          action: 'send_message',
          message,
          level: 'error',
          route: '/app/copilot',
          metadata: stringifyMetadata({
            threadId: args.threadId,
            mode,
            assistantKind,
          }),
        }),
      ])
      throw error
    }
  },
})
