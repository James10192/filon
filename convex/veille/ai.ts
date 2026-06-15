import { v } from 'convex/values'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'
import { requireUserFromAction } from '../lib/withUser'
import { creditsForUsage } from '../lib/credits'
import { ensureAiBudget } from '../lib/aiGate'
import { modelFor, MODELS, type AiMode } from '../agent/models'
import type { OpportunityForAi } from './aiData'

/**
 * Veille IA · analyse « à l'acte » d'un signal (action LLM).
 *
 * - `analyzeSignal` : score de pertinence + action recommandée + justification.
 *   Mis en cache (`aiSignals`) : une analyse déjà payée n'est jamais re-débitée.
 * - `draftMessage` : brouillon du 1er message (candidature ou démarchage).
 *
 * Gating CRÉDITS (dégustation, tous paliers), pas copilot-only : free goûte (25),
 * pro_ai/copilot ont une vraie allocation. Solde épuisé → `aiCreditError` →
 * l'UI propose la montée en grade (sauf fair-use copilot, toléré jusqu'au plafond).
 */

const modeValidator = v.union(v.literal('fast'), v.literal('quality'))

/** Contexte d'opportunité formaté pour le LLM (français, sans codes internes). */
function offerContext(o: OpportunityForAi): string {
  const lines = [`Intitulé : ${o.title}`]
  if (o.companyName) lines.push(`Entreprise : ${o.companyName}`)
  if (o.location) lines.push(`Lieu : ${o.location}`)
  if (o.source) lines.push(`Source : ${o.source}`)
  if (o.description) lines.push(`Description : ${o.description.slice(0, 1200)}`)
  return lines.join('\n')
}

const SCORING_SYSTEM = `Tu es l'assistant de prospection d'un développeur freelance basé en Côte d'Ivoire.
On te donne une offre repérée par sa veille. Évalue-la pour LUI.

Réponds STRICTEMENT en français (écriture latine), sans jargon ni codes techniques internes.
- score : pertinence de 0 à 100 pour un développeur freelance (compétences tech, faisabilité, intérêt business).
- suggestedAction :
  • "apply" s'il a intérêt à postuler/répondre directement à l'offre,
  • "prospect" si l'intérêt est plutôt de DÉMARCHER l'entreprise en prestation (elle recrute donc elle a un budget tech),
  • "ignore" si c'est hors de son champ (poste non-tech, sans valeur pour lui).
- rationale : 1 à 2 phrases concrètes justifiant le score et l'action, adressées à lui (« tu »).`

const DRAFT_SYSTEM = `Tu es l'assistant de prospection d'un développeur freelance basé en Côte d'Ivoire.
Rédige un PREMIER message prêt à envoyer, en français professionnel et chaleureux, écriture latine.
Pas de markdown, pas de titres, pas de variables à trous : un texte fini, signé « [Votre nom] ».
Reste concret et bref (120-180 mots). Mentionne brièvement la valeur que le freelance peut apporter.`

/**
 * `api.veille.ai.analyzeSignal` : score + action recommandée pour une opportunité.
 * Renvoie l'analyse en cache sans re-débiter (sauf `force`).
 */
export const analyzeSignal = action({
  args: {
    opportunityId: v.id('opportunities'),
    mode: v.optional(modeValidator),
    force: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    score: number
    suggestedAction: 'apply' | 'prospect' | 'ignore'
    rationale: string
    cached: boolean
  }> => {
    const { userId } = await requireUserFromAction(ctx)
    const mode: AiMode = args.mode ?? 'fast'

    if (!args.force) {
      const cached = await ctx.runQuery(
        internal.veille.aiData.getSignalInternal,
        { opportunityId: args.opportunityId },
      )
      if (cached && cached.userId === userId) {
        return {
          score: cached.score,
          suggestedAction: cached.suggestedAction,
          rationale: cached.rationale,
          cached: true,
        }
      }
    }

    const opp = await ctx.runQuery(
      internal.veille.aiData.loadOpportunityForAi,
      { userId, opportunityId: args.opportunityId },
    )
    if (!opp) throw new Error('Opportunité introuvable.')

    const gate = await ctx.runQuery(internal.veille.aiData.aiSignalGate, {
      userId,
    })
    ensureAiBudget(gate)

    const { object, usage } = await generateObject({
      model: modelFor(mode),
      schema: z.object({
        score: z.number().int().min(0).max(100),
        suggestedAction: z.enum(['apply', 'prospect', 'ignore']),
        rationale: z.string().max(400),
      }),
      system: SCORING_SYSTEM,
      prompt: offerContext(opp),
    })

    const inputTokens = usage.inputTokens ?? 0
    const outputTokens = usage.outputTokens ?? 0
    const credits = creditsForUsage(inputTokens, outputTokens, mode)
    await Promise.all([
      ctx.runMutation(internal.aiCredits.debit, {
        userId,
        threadId: `veille:${args.opportunityId}`,
        model: MODELS[mode],
        mode,
        inputTokens,
        outputTokens,
        credits,
        toolsUsed: ['veille_score'],
      }),
      ctx.runMutation(internal.veille.aiData.saveSignal, {
        userId,
        opportunityId: args.opportunityId,
        score: object.score,
        suggestedAction: object.suggestedAction,
        rationale: object.rationale,
      }),
    ])

    return { ...object, cached: false }
  },
})

/**
 * `api.veille.ai.draftMessage` : brouillon du 1er message (candidature si l'action
 * recommandée est « postuler », démarchage sinon). Débite des crédits, mémorise
 * le brouillon dans l'analyse.
 */
export const draftMessage = action({
  args: {
    opportunityId: v.id('opportunities'),
    mode: v.optional(modeValidator),
  },
  handler: async (ctx, args): Promise<{ draft: string }> => {
    const { userId } = await requireUserFromAction(ctx)
    const mode: AiMode = args.mode ?? 'fast'

    const opp = await ctx.runQuery(
      internal.veille.aiData.loadOpportunityForAi,
      { userId, opportunityId: args.opportunityId },
    )
    if (!opp) throw new Error('Opportunité introuvable.')

    const gate = await ctx.runQuery(internal.veille.aiData.aiSignalGate, {
      userId,
    })
    ensureAiBudget(gate)

    const signal = await ctx.runQuery(
      internal.veille.aiData.getSignalInternal,
      { opportunityId: args.opportunityId },
    )
    const action =
      signal?.suggestedAction === 'prospect' ? 'prospect' : 'apply'
    const goal =
      action === 'prospect'
        ? "Objectif : DÉMARCHER cette entreprise pour lui proposer tes services de développement (elle recrute, donc elle a un besoin tech et un budget)."
        : 'Objectif : répondre/postuler à cette offre en te positionnant comme le bon profil.'

    const { text, usage } = await generateText({
      model: modelFor(mode),
      system: DRAFT_SYSTEM,
      prompt: `${goal}\n\n${offerContext(opp)}`,
    })

    const inputTokens = usage.inputTokens ?? 0
    const outputTokens = usage.outputTokens ?? 0
    const credits = creditsForUsage(inputTokens, outputTokens, mode)
    await Promise.all([
      ctx.runMutation(internal.aiCredits.debit, {
        userId,
        threadId: `veille:${args.opportunityId}`,
        model: MODELS[mode],
        mode,
        inputTokens,
        outputTokens,
        credits,
        toolsUsed: ['veille_draft'],
      }),
      ctx.runMutation(internal.veille.aiData.saveDraft, {
        opportunityId: args.opportunityId,
        draft: text,
      }),
    ])

    return { draft: text }
  },
})
