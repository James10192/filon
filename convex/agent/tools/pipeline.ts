import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
import type { Id } from '../../_generated/dataModel'
import { approval, canRun, logAction, requireUserId } from './shared'

/**
 * Outils du domaine PIPELINE (opportunités) : lectures automatiques (résumé,
 * listing, recherche, opportunités sans prochaine action) + écritures soumises
 * au flux d'approbation (création, changement d'étape, brouillon, activité).
 *
 * Toutes les opérations délèguent à un `internalQuery`/`internalMutation` scopé
 * `userId` : aucune fuite cross-tenant, aucune écriture sans contrôle de mode.
 */

const STAGE = z.enum([
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
])

// --- Lectures --------------------------------------------------------------

export const summarizePipeline = createTool({
  description:
    'Résume le pipeline : nombre total d’opportunités, actives, gagnées, et répartition par étape.',
  inputSchema: z.object({}),
  execute: async (ctx): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.pipelineSummary, {
      userId: requireUserId(ctx),
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

export const listOpportunities = createTool({
  description:
    'Liste les opportunités du pipeline, avec filtres optionnels par étape, type et priorité.',
  inputSchema: z.object({
    stage: STAGE.optional(),
    type: z.enum(['job_offer', 'spontaneous', 'prospect', 'mission']).optional(),
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

// --- Écritures (approbation) -----------------------------------------------

export const createOpportunity = createTool({
  description:
    'Crée une opportunité dans le pipeline (titre + type requis). Crée l’entreprise si elle n’existe pas encore.',
  inputSchema: z.object({
    title: z.string().min(1),
    type: z.enum(['job_offer', 'spontaneous', 'prospect', 'mission']),
    stage: STAGE.optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    companyName: z.string().optional(),
    url: z.string().optional(),
    deadline: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    if (!(await canRun(ctx, 'create_opportunity'))) {
      return approval('create_opportunity', `Créer l’opportunité « ${input.title} »`)
    }
    const res = (await ctx.runMutation(internal.agent.mutations.createOpportunity, {
      userId: requireUserId(ctx),
      ...input,
    })) as { id: string }
    await logAction(ctx, {
      tool: 'create_opportunity',
      summary: `Opportunité « ${input.title} » créée`,
      entityType: 'opportunity',
      entityId: res.id,
    })
    return res
  },
})

export const updateOpportunityStage = createTool({
  description: 'Déplace une opportunité vers une autre étape du pipeline.',
  inputSchema: z.object({
    opportunityId: z.string().min(1),
    stage: STAGE,
  }),
  execute: async (ctx, input): Promise<unknown> => {
    if (!(await canRun(ctx, 'update_opportunity_stage'))) {
      return approval(
        'update_opportunity_stage',
        `Déplacer l’opportunité vers « ${input.stage} »`,
      )
    }
    const res = await ctx.runMutation(internal.agent.mutations.updateOpportunityStage, {
      userId: requireUserId(ctx),
      opportunityId: input.opportunityId as Id<'opportunities'>,
      stage: input.stage,
    })
    await logAction(ctx, {
      tool: 'update_opportunity_stage',
      summary: `Opportunité déplacée vers « ${input.stage} »`,
      entityType: 'opportunity',
      entityId: input.opportunityId,
    })
    return res
  },
})

export const draftApplication = createTool({
  description:
    'Rédige un brouillon (e-mail, lettre ou pitch) pour une opportunité et l’enregistre dans sa timeline.',
  inputSchema: z.object({
    opportunityId: z.string().min(1),
    kind: z.enum(['email', 'lettre', 'pitch']),
    content: z.string().min(1),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    if (!(await canRun(ctx, 'draft_application'))) {
      return approval(
        'draft_application',
        `Enregistrer un brouillon ${input.kind} sur l’opportunité`,
      )
    }
    const res = await ctx.runMutation(internal.agent.mutations.draftApplication, {
      userId: requireUserId(ctx),
      opportunityId: input.opportunityId as Id<'opportunities'>,
      kind: input.kind,
      content: input.content,
    })
    await logAction(ctx, {
      tool: 'draft_application',
      summary: `Brouillon ${input.kind} enregistré`,
      entityType: 'opportunity',
      entityId: input.opportunityId,
    })
    return res
  },
})

export const addActivity = createTool({
  description:
    'Ajoute une activité (note, e-mail, appel, entretien) à la timeline d’une opportunité.',
  inputSchema: z.object({
    opportunityId: z.string().min(1),
    kind: z.enum(['note', 'email', 'call', 'interview', 'status_change', 'other']),
    content: z.string().min(1),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    if (!(await canRun(ctx, 'add_activity'))) {
      return approval('add_activity', 'Ajouter une activité à la timeline')
    }
    const res = await ctx.runMutation(internal.agent.mutations.addActivity, {
      userId: requireUserId(ctx),
      opportunityId: input.opportunityId as Id<'opportunities'>,
      kind: input.kind,
      content: input.content,
    })
    await logAction(ctx, {
      tool: 'add_activity',
      summary: 'Activité ajoutée à la timeline',
      entityType: 'opportunity',
      entityId: input.opportunityId,
    })
    return res
  },
})

export const pipelineTools = {
  summarize_pipeline: summarizePipeline,
  pipeline_stats: pipelineStats,
  list_opportunities: listOpportunities,
  opportunities_needing_action: opportunitiesNeedingAction,
  search_opportunities: searchOpportunities,
  create_opportunity: createOpportunity,
  update_opportunity_stage: updateOpportunityStage,
  draft_application: draftApplication,
  add_activity: addActivity,
}
