import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
import type { Id } from '../../_generated/dataModel'

/**
 * Outils d'ÉCRITURE du copilote (soumis au flux d'approbation).
 *
 * Avant d'écrire, chaque outil consulte les préférences de permission du user
 * (`aiPermissionPrefs`) via `permissionFor` :
 *  - mode `auto` / `bypass` : exécution directe.
 *  - mode `accept`          : exécution directe (l'utilisateur accepte par
 *    défaut, mais peut révoquer un outil de `alwaysAllow`).
 *  - mode `ask`             : exécution UNIQUEMENT si l'outil est dans
 *    `alwaysAllow` ; sinon l'outil renvoie une demande d'approbation structurée
 *    (`approvalRequired`) que l'UI présente, et que `respondApproval` arbitre.
 *
 * Toutes les écritures délèguent à un `internalMutation` scopé `userId`.
 */

type PermMode = 'ask' | 'accept' | 'auto' | 'bypass'

type ApprovalRequired = {
  approvalRequired: true
  tool: string
  summary: string
}

/** Identité utilisateur du ToolCtx (posée par l'action du copilote). */
function requireUserId(ctx: { userId?: string }): string {
  if (!ctx.userId) throw new Error('Contexte utilisateur manquant')
  return ctx.userId
}

/** Décide si une écriture peut s'exécuter selon le mode + alwaysAllow. */
async function canRun(
  ctx: {
    userId?: string
    runQuery: (ref: any, args: any) => Promise<any>
  },
  tool: string,
): Promise<boolean> {
  const userId = requireUserId(ctx)
  const prefs: { mode: PermMode; alwaysAllow: string[] } = await ctx.runQuery(
    internal.agent.permissions.getPrefs,
    { userId },
  )
  if (prefs.mode === 'auto' || prefs.mode === 'bypass') return true
  if (prefs.mode === 'accept') return true
  // mode `ask` : seulement si l'outil est explicitement toujours autorisé.
  return prefs.alwaysAllow.includes(tool)
}

function approval(tool: string, summary: string): ApprovalRequired {
  return { approvalRequired: true, tool, summary }
}

export const createOpportunity = createTool({
  description:
    'Crée une opportunité dans le pipeline (titre + type requis). Crée l’entreprise si elle n’existe pas encore.',
  inputSchema: z.object({
    title: z.string().min(1),
    type: z.enum(['job_offer', 'spontaneous', 'prospect', 'mission']),
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
    priority: z.enum(['low', 'medium', 'high']).optional(),
    companyName: z.string().optional(),
    url: z.string().optional(),
    deadline: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    if (!(await canRun(ctx, 'create_opportunity'))) {
      return approval(
        'create_opportunity',
        `Créer l’opportunité « ${input.title} »`,
      )
    }
    return ctx.runMutation(internal.agent.mutations.createOpportunity, {
      userId: requireUserId(ctx),
      ...input,
    })
  },
})

export const scheduleFollowup = createTool({
  description:
    'Planifie une relance datée (intitulé + date ISO), liée optionnellement à une opportunité ou une proposition.',
  inputSchema: z.object({
    label: z.string().min(1),
    dueDate: z.string().min(1),
    opportunityId: z.string().optional(),
    proposalId: z.string().optional(),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    if (!(await canRun(ctx, 'schedule_followup'))) {
      return approval(
        'schedule_followup',
        `Planifier la relance « ${input.label} » pour le ${input.dueDate}`,
      )
    }
    const args: {
      userId: string
      label: string
      dueDate: string
      opportunityId?: Id<'opportunities'>
      proposalId?: Id<'proposals'>
    } = {
      userId: requireUserId(ctx),
      label: input.label,
      dueDate: input.dueDate,
    }
    if (input.opportunityId) {
      args.opportunityId = input.opportunityId as Id<'opportunities'>
    }
    if (input.proposalId) {
      args.proposalId = input.proposalId as Id<'proposals'>
    }
    return ctx.runMutation(internal.agent.mutations.scheduleFollowup, args)
  },
})

export const updateOpportunityStage = createTool({
  description: 'Déplace une opportunité vers une autre étape du pipeline.',
  inputSchema: z.object({
    opportunityId: z.string().min(1),
    stage: z.enum([
      'lead',
      'contacted',
      'applied',
      'interview',
      'negotiation',
      'won',
      'lost',
    ]),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    if (!(await canRun(ctx, 'update_opportunity_stage'))) {
      return approval(
        'update_opportunity_stage',
        `Déplacer l’opportunité vers « ${input.stage} »`,
      )
    }
    return ctx.runMutation(internal.agent.mutations.updateOpportunityStage, {
      userId: requireUserId(ctx),
      opportunityId: input.opportunityId as Id<'opportunities'>,
      stage: input.stage,
    })
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
    return ctx.runMutation(internal.agent.mutations.draftApplication, {
      userId: requireUserId(ctx),
      opportunityId: input.opportunityId as Id<'opportunities'>,
      kind: input.kind,
      content: input.content,
    })
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
    return ctx.runMutation(internal.agent.mutations.addActivity, {
      userId: requireUserId(ctx),
      opportunityId: input.opportunityId as Id<'opportunities'>,
      kind: input.kind,
      content: input.content,
    })
  },
})

export const writeTools = {
  create_opportunity: createOpportunity,
  schedule_followup: scheduleFollowup,
  update_opportunity_stage: updateOpportunityStage,
  draft_application: draftApplication,
  add_activity: addActivity,
}
