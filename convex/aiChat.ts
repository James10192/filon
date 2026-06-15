import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { requireUser, requireUserFromAction, requireCopilot } from './lib/withUser'
import { aiCreditError } from './lib/plan'
import type { PaginationResult } from 'convex/server'
import type { MessageDoc } from '@convex-dev/agent'
import { vStreamArgs } from '@convex-dev/agent/validators'
import { copilot } from './agent/agent'
import { modelFor, MODELS, type AiMode } from './agent/models'

/**
 * Domaine aiChat · point d'entrée du copilote (threads, messages, envoi).
 *
 * - `createThread` (mutation) : crée un fil Agent + son miroir `aiThreads`,
 *   gaté `requireCopilot`.
 * - `listThreads` / `listMessages` (queries) : historique scopé `userId`.
 * - `sendMessage` (action) : gate copilot + pré-contrôle crédits, streame la
 *   réponse (deltas persistés), puis débite les crédits et journalise l'usage.
 * - `respondApproval` (mutation) : arbitre une demande d'approbation d'outil et,
 *   si « toujours », mémorise l'outil dans `alwaysAllow`.
 */

const modeValidator = v.union(v.literal('fast'), v.literal('quality'))

/**
 * Tarifs modèle (USD / million de tokens), par mode. Conservateurs (arrondis au-
 * dessus) pour protéger la marge. À mettre à jour si OpenRouter change ses prix
 * ou si on change de modèle dans `convex/agent/models.ts`.
 */
const MODEL_PRICING: Record<AiMode, { inUsd: number; outUsd: number }> = {
  fast: { inUsd: 0.25, outUsd: 2 }, // gpt-5.4-mini (classe mini)
  quality: { inUsd: 3, outUsd: 15 }, // claude-sonnet-4.6
}

/**
 * Plancher de marge garanti (arbitrage grill-me 2026-06-15). FX facturé au-dessus
 * du spot (~605) pour absorber la volatilité du franc ; MARKUP = marge minimale
 * garantie sur le coût réel ; CREDIT_XOF = prix de détail d'un crédit (mi-pack).
 */
const FX_XOF_PER_USD = 680
const AI_MARKUP = 8
const CREDIT_XOF = 8

/**
 * Coût en crédits d'un échange = MAX(poids de tokens, plancher coût-réel).
 *
 * - Le poids de tokens (1× rapide, 3× qualité) reste prévisible pour l'utilisateur
 *   en usage normal.
 * - Le plancher coût-réel (coût modèle estimé × FX × markup) garantit la marge :
 *   il suit l'output cher (qualité) et toute hausse de prix modèle, donc on n'est
 *   JAMAIS sous l'eau. En pratique il domine en mode qualité, le poids domine en
 *   rapide. Voir arbitrage grill-me 2026-06-15.
 */
function creditsForUsage(
  inputTokens: number,
  outputTokens: number,
  mode: AiMode,
): number {
  const totalK = (inputTokens + outputTokens) / 1000
  const weight = mode === 'quality' ? 3 : 1
  const tokenCredits = Math.ceil(totalK * weight)

  const price = MODEL_PRICING[mode]
  const costUsd =
    (inputTokens / 1_000_000) * price.inUsd +
    (outputTokens / 1_000_000) * price.outUsd
  const floorCredits = Math.ceil(
    (costUsd * FX_XOF_PER_USD * AI_MARKUP) / CREDIT_XOF,
  )

  return Math.max(1, tokenCredits, floorCredits)
}

/** Gate copilot depuis une query (pour l'action via runQuery). */
export const assertCopilot = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<{ balance: number }> => {
    await requireCopilot(ctx, userId)
    const row = await ctx.db
      .query('aiCredits')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    return { balance: (row?.balance ?? 0) + (row?.packBalance ?? 0) }
  },
})

/** Enregistre le miroir `aiThreads` à la création d'un fil. */
export const recordThread = internalMutation({
  args: { userId: v.string(), threadId: v.string(), title: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    const now = Date.now()
    const doc: Record<string, unknown> = {
      userId: args.userId,
      threadId: args.threadId,
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

/** Met à jour `lastMessageAt` du miroir de fil (après un échange). */
export const bumpThread = internalMutation({
  args: { userId: v.string(), threadId: v.string() },
  handler: async (ctx, { userId, threadId }): Promise<null> => {
    const doc = await ctx.db
      .query('aiThreads')
      .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
      .unique()
    if (doc && doc.userId === userId) {
      await ctx.db.patch(doc._id, { lastMessageAt: Date.now() })
    }
    return null
  },
})

/**
 * `api.aiChat.createThread` : ouvre un nouveau fil de conversation. Gaté au
 * palier Copilot. Crée le fil côté composant Agent et son miroir applicatif.
 */
export const createThread = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ threadId: string }> => {
    const { userId } = await requireUser(ctx)
    await requireCopilot(ctx, userId)
    // Initialise la ligne de crédits si absente (idempotent).
    await ctx.runMutation(internal.aiCredits.ensureCredits, { userId })

    const { threadId } = await copilot.createThread(ctx, {
      userId,
      ...(args.title !== undefined ? { title: args.title } : {}),
    })
    await ctx.runMutation(internal.aiChat.recordThread, {
      userId,
      threadId,
      ...(args.title !== undefined ? { title: args.title } : {}),
    })
    return { threadId }
  },
})

/** `api.aiChat.listThreads` : fils du user, du plus récent au plus ancien. */
export const listThreads = query({
  args: {},
  handler: async (ctx): Promise<Doc<'aiThreads'>[]> => {
    const { userId } = await requireUser(ctx)
    return ctx.db
      .query('aiThreads')
      .withIndex('by_user_last', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

/**
 * `api.aiChat.listMessages` : messages d'un fil (paginé), après vérification que
 * le fil appartient au user courant.
 */
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
    if (!mirror || mirror.userId !== userId) throw new Error('Non autorisé')

    const paginated: PaginationResult<MessageDoc> = await copilot.listMessages(
      ctx,
      {
        threadId: args.threadId,
        paginationOpts: args.paginationOpts,
      },
    )
    // Deltas de streaming (lus par le hook `useThreadMessages({ stream: true })`).
    const streams = await copilot.syncStreams(ctx, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    })
    return { ...paginated, streams }
  },
})

/**
 * `api.aiChat.sendMessage` : envoie un message dans un fil et streame la réponse
 * du copilote (deltas persistés en base, lus côté client par les hooks Agent).
 * Gate copilot + pré-contrôle de crédits (throw `AI_CREDIT:` si solde épuisé).
 * À la fin, débite les crédits consommés et journalise l'usage.
 */
export const sendMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    mode: v.optional(modeValidator),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const { userId } = await requireUserFromAction(ctx)
    const mode: AiMode = args.mode ?? 'fast'

    // Gate copilot + solde courant (pré-contrôle avant l'appel LLM).
    const { balance } = await ctx.runQuery(internal.aiChat.assertCopilot, {
      userId,
    })
    if (balance <= 0) {
      throw aiCreditError()
    }

    const { thread } = await copilot.continueThread(ctx, {
      threadId: args.threadId,
      userId,
    })

    const result = await thread.streamText(
      { prompt: args.prompt, model: modelFor(mode) },
      { saveStreamDeltas: true },
    )

    // Draine le flux pour garantir l'exécution complète (outils + génération).
    await result.consumeStream()

    const usage = await result.usage
    const toolCalls = await result.toolCalls
    const inputTokens = usage.inputTokens ?? 0
    const outputTokens = usage.outputTokens ?? 0
    const toolsUsed = Array.from(
      new Set(toolCalls.map((c) => c.toolName)),
    )
    const credits = creditsForUsage(inputTokens, outputTokens, mode)

    await ctx.runMutation(internal.aiCredits.debit, {
      userId,
      threadId: args.threadId,
      model: MODELS[mode],
      mode,
      inputTokens,
      outputTokens,
      credits,
      toolsUsed,
    })
    await ctx.runMutation(internal.aiChat.bumpThread, {
      userId,
      threadId: args.threadId,
    })
    return { ok: true }
  },
})

/**
 * `api.aiChat.respondApproval` : arbitre une demande d'approbation d'outil
 * d'écriture émise par le copilote. `decision` :
 *  - `once`    : autorise cette fois (le client relance l'action).
 *  - `always`  : autorise et mémorise l'outil dans `alwaysAllow`.
 *  - `deny`    : refuse.
 * Met à jour les préférences de permission si « toujours ».
 */
export const respondApproval = mutation({
  args: {
    tool: v.string(),
    decision: v.union(
      v.literal('once'),
      v.literal('always'),
      v.literal('deny'),
    ),
  },
  handler: async (ctx, args): Promise<{ approved: boolean }> => {
    const { userId } = await requireUser(ctx)
    if (args.decision === 'deny') return { approved: false }

    if (args.decision === 'always') {
      const doc = await ctx.db
        .query('aiPermissionPrefs')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique()
      if (!doc) {
        await ctx.db.insert('aiPermissionPrefs', {
          userId,
          mode: 'ask',
          alwaysAllow: [args.tool],
          updatedAt: Date.now(),
        })
      } else if (!doc.alwaysAllow.includes(args.tool)) {
        await ctx.db.patch(doc._id, {
          alwaysAllow: [...doc.alwaysAllow, args.tool],
          updatedAt: Date.now(),
        })
      }
    }
    return { approved: true }
  },
})
