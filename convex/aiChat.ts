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
import { forbiddenError, notFoundError, allowsQualityModel } from './lib/plan'
import { type Plan } from './lib/plan'
import { creditsForUsage } from './lib/credits'
import { readCreditState, ensureAiBudget, type AiBudget } from './lib/aiGate'
import { decryptSecret } from './lib/crypto'
import type { PaginationResult } from 'convex/server'
import type { MessageDoc } from '@convex-dev/agent'
import { vStreamArgs } from '@convex-dev/agent/validators'
import { copilot } from './agent/agent'
import { tools } from './agent/tools'
import { toolsFor, stopWhenFor } from './agent/gating'
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

/** Gate copilot depuis une query (pour l'action via runQuery). */
/**
 * Pré-contrôle d'accès + crédits depuis une query (pour l'action via runQuery).
 * Retourne le palier, le solde (mensuel + pack), la consommation du mois et
 * l'allocation, de quoi appliquer la stratégie fair-use côté `sendMessage`.
 */
export const aiGate = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<AiBudget> => {
    const plan = await requireCopilot(ctx, userId)
    return readCreditState(ctx, userId, plan)
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
/**
 * Titre déterministe d'un fil, dérivé de l'outil principal utilisé (gratuit,
 * domain-specific). À défaut d'outil, on retombe sur le premier message tronqué.
 */
const TOOL_TITLE: Record<string, string> = {
  summarize_pipeline: 'Analyse du pipeline',
  pipeline_stats: 'Analyse du pipeline',
  list_opportunities: "Recherche d'opportunités",
  search_opportunities: "Recherche d'opportunités",
  list_proposals: 'Revue des propositions',
  due_followups: 'Relances à faire',
  find_company: 'Recherche carnet',
  find_contact: 'Recherche carnet',
  create_opportunity: 'Nouvelle opportunité',
  schedule_followup: 'Relance planifiée',
  update_opportunity_stage: 'Mise à jour du pipeline',
  draft_application: 'Brouillon de candidature',
  add_activity: 'Note ajoutée',
}

function deriveTitle(toolsUsed: string[], prompt: string): string {
  for (const t of toolsUsed) {
    if (TOOL_TITLE[t]) return TOOL_TITLE[t]
  }
  const clean = prompt.trim().replace(/\s+/g, ' ')
  if (!clean) return 'Conversation'
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean
}

export const bumpThread = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    toolsUsed: v.optional(v.array(v.string())),
    prompt: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, threadId, toolsUsed, prompt },
  ): Promise<null> => {
    const doc = await ctx.db
      .query('aiThreads')
      .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
      .unique()
    if (doc && doc.userId === userId) {
      const patch: { lastMessageAt: number; title?: string } = {
        lastMessageAt: Date.now(),
      }
      // Auto-titre au premier échange (tant que le fil n'a pas de titre).
      if (!doc.title && prompt !== undefined) {
        patch.title = deriveTitle(toolsUsed ?? [], prompt)
      }
      await ctx.db.patch(doc._id, patch)
    }
    return null
  },
})

/**
 * `internal.aiChat.logAction` : journalise une écriture de l'agent (audit +
 * lien entité). Appelée par les outils d'écriture après exécution réussie.
 */
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

/** `api.aiChat.listActions` : journal des actions de l'agent (récent d'abord). */
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

/** `api.aiChat.renameThread` : renomme un fil (titre personnalisé). */
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
    if (!mirror || mirror.userId !== userId) throw forbiddenError('Non autorisé')

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
    const requested: AiMode = args.mode ?? 'fast'

    // Gate accès + solde (pré-contrôle avant l'appel LLM). Stratégie fair-use :
    // les paliers Copilot ne sont pas bloqués net à zéro (la marge ×8 nous
    // couvre), on continue jusqu'à un plafond anti-abus ; les paliers en
    // dégustation (free/pro/pro_ai) butent sur un mur dur = déclencheur d'upgrade.
    const gate = await ctx.runQuery(internal.aiChat.aiGate, { userId })

    // BYOK : un utilisateur Copilot/Copilot Max ayant fourni sa propre clé
    // OpenRouter valide passe par SA clé. On ne pré-contrôle alors PAS son solde
    // (il paie son fournisseur) et on ne débitera AUCUN crédit. Si le chiffré est
    // illisible (rotation de BYOK_ENCRYPTION_KEY), on retombe sans bruit sur
    // notre clé + régime de crédits normal — jamais d'échec de chat pour ça.
    let byokKey: string | null = null
    const byok = await ctx.runQuery(internal.byok.resolve, { userId })
    if (byok.eligible && byok.ciphertext && byok.provider) {
      try {
        byokKey = await decryptSecret(byok.ciphertext, userId, byok.provider)
      } catch {
        byokKey = null
      }
    }

    // Le pré-contrôle de solde ne s'applique qu'au régime « nos crédits ».
    if (!byokKey) ensureAiBudget(gate)

    // Clamp serveur : le modèle « Qualité » est réservé aux paliers Copilot. On
    // ne fait JAMAIS confiance au `mode` reçu du client : si le palier n'y a pas
    // droit, on rabat sur « Rapide ».
    const mode: AiMode =
      requested === 'quality' && !allowsQualityModel(gate.plan)
        ? 'fast'
        : requested

    const { thread } = await copilot.continueThread(ctx, {
      threadId: args.threadId,
      userId,
    })

    // Injecte la date du jour en contexte : l'agent en a besoin pour proposer
    // des dates de relance concrètes (sinon il ne connaît pas « aujourd'hui »).
    const today = new Date().toISOString().slice(0, 10)
    const contextualPrompt = `Contexte (ne pas répondre à ceci) : date du jour = ${today}.\n\n${args.prompt}`

    // Gating : on calcule, par échange, l'exposition des outils et la condition
    // d'arrêt selon le palier ET le rôle d'organisation. On résout l'org active
    // + le rôle du user (null hors org) ; le manifeste filtre alors les outils
    // équipe pour les non-managers (un user voit <= ~14 outils). Le copilot_max
    // peut enchaîner plus d'étapes (workflows composites).
    const orgRole = await ctx.runQuery(internal.agent.orgReads.orgRole, {
      userId,
    })
    const exposedTools = toolsFor(gate.plan, orgRole?.role ?? null, tools)
    const stopWhen = stopWhenFor(gate.plan)

    const result = await thread.streamText(
      {
        prompt: contextualPrompt,
        model: modelFor(mode, gate.plan, byokKey ?? undefined),
        tools: exposedTools,
        stopWhen,
      },
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

    // Horodatage du fil : toujours. Débit de crédits : UNIQUEMENT hors BYOK (en
    // BYOK l'appel a consommé la clé de l'utilisateur, pas nos crédits). Les deux
    // mutations sont indépendantes → en parallèle.
    const tasks: Promise<unknown>[] = [
      ctx.runMutation(internal.aiChat.bumpThread, {
        userId,
        threadId: args.threadId,
        toolsUsed,
        prompt: args.prompt,
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
