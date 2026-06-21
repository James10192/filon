import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
import type { Id } from '../../_generated/dataModel'
import { approval, canRun, logAction, requireUserId } from './shared'

/**
 * Outils du domaine RELANCES : lecture des échéances proches (auto) + écriture
 * d'une relance datée (soumise au flux d'approbation), liée optionnellement à
 * une opportunité ou une proposition. Tout est scopé `userId`.
 */

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
    const res = (await ctx.runMutation(
      internal.agent.mutations.scheduleFollowup,
      args,
    )) as { id: string }
    await logAction(ctx, {
      tool: 'schedule_followup',
      summary: `Relance « ${input.label} » planifiée pour le ${input.dueDate}`,
      entityType: 'followup',
      entityId: res.id,
    })
    return res
  },
})

export const followupTools = {
  due_followups: dueFollowups,
  schedule_followup: scheduleFollowup,
}
