import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'

/**
 * Outils de LECTURE du copilote (exécution automatique, sans approbation).
 *
 * Chaque outil délègue à un `internalQuery` scopé par `ctx.userId` (l'identité
 * du user courant, posée sur le ToolCtx par l'action du copilote). Aucune
 * écriture, aucune fuite cross-tenant : les queries filtrent toutes `by_user*`.
 */

/** Garde l'identité utilisateur du ToolCtx (toujours posée par l'action). */
function requireUserId(ctx: { userId?: string }): string {
  if (!ctx.userId) throw new Error('Contexte utilisateur manquant')
  return ctx.userId
}

export const summarizePipeline = createTool({
  description:
    'Résume le pipeline : nombre total d’opportunités, actives, gagnées, et répartition par étape.',
  inputSchema: z.object({}),
  execute: async (ctx): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.pipelineSummary, {
      userId: requireUserId(ctx),
    }),
})

export const listOpportunities = createTool({
  description:
    'Liste les opportunités du pipeline, avec filtres optionnels par étape, type et priorité.',
  inputSchema: z.object({
    stage: z
      .enum([
        'lead',
        'contacted',
        'applied',
        'interview',
        'negotiation',
        'won',
        'lost',
      ])
      .optional(),
    type: z
      .enum(['job_offer', 'spontaneous', 'prospect', 'mission'])
      .optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    limit: z.number().int().positive().max(50).optional(),
  }),
  execute: async (ctx, input): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.listOpportunities, {
      userId: requireUserId(ctx),
      ...input,
    }),
})

export const opportunitiesNeedingAction = createTool({
  description:
    "Liste les opportunités ACTIVES (ni gagnées ni perdues) qui n'ont PAS de prochaine action planifiée, à relancer en priorité. À utiliser quand on demande de proposer une prochaine étape pour les opportunités sans suite.",
  inputSchema: z.object({
    limit: z.number().int().positive().max(50).optional(),
  }),
  execute: async (ctx, input): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.opportunitiesNeedingAction, {
      userId: requireUserId(ctx),
      ...input,
    }),
})

export const searchOpportunities = createTool({
  description:
    'Recherche des opportunités par mot-clé dans leur titre (recherche plein texte).',
  inputSchema: z.object({ query: z.string().min(1) }),
  execute: async (ctx, input): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.searchOpportunities, {
      userId: requireUserId(ctx),
      query: input.query,
    }),
})

export const listProposals = createTool({
  description:
    'Liste les propositions de démarchage, avec filtre optionnel par statut.',
  inputSchema: z.object({
    status: z.enum(['draft', 'sent', 'accepted', 'refused']).optional(),
  }),
  execute: async (ctx, input): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.listProposals, {
      userId: requireUserId(ctx),
      ...input,
    }),
})

export const dueFollowups = createTool({
  description:
    'Liste les relances non terminées dont l’échéance tombe dans les prochains jours (7 par défaut).',
  inputSchema: z.object({
    withinDays: z.number().int().positive().max(90).optional(),
  }),
  execute: async (ctx, input): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.dueFollowups, {
      userId: requireUserId(ctx),
      ...input,
    }),
})

export const pipelineStats = createTool({
  description:
    'Statistiques agrégées du pipeline (total, actives, gagnées, par étape).',
  inputSchema: z.object({}),
  execute: async (ctx): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.pipelineSummary, {
      userId: requireUserId(ctx),
    }),
})

export const findCompany = createTool({
  description: 'Trouve une entreprise par nom (recherche plein texte).',
  inputSchema: z.object({ query: z.string().min(1) }),
  execute: async (ctx, input): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.findCompany, {
      userId: requireUserId(ctx),
      query: input.query,
    }),
})

export const findContact = createTool({
  description: 'Trouve un contact par nom, rôle ou e-mail.',
  inputSchema: z.object({ query: z.string().min(1) }),
  execute: async (ctx, input): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.findContact, {
      userId: requireUserId(ctx),
      query: input.query,
    }),
})

export const readTools = {
  summarize_pipeline: summarizePipeline,
  list_opportunities: listOpportunities,
  opportunities_needing_action: opportunitiesNeedingAction,
  search_opportunities: searchOpportunities,
  list_proposals: listProposals,
  due_followups: dueFollowups,
  pipeline_stats: pipelineStats,
  find_company: findCompany,
  find_contact: findContact,
}
