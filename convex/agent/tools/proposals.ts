import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
import type { Id } from '../../_generated/dataModel'
import { requireUserId } from './shared'

/**
 * Outils du domaine PROPOSITIONS (démarchage) : lecture des propositions du user
 * avec filtre optionnel par statut. Scopé `userId`, lecture automatique.
 */

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

export const getProposalDetail = createTool({
  description:
    "Charge le détail d'une proposition ou proforma précise, avec entreprise liée, destinataires et relances associées.",
  inputSchema: z
    .object({
      proposalId: z.string().min(1).optional(),
      query: z.string().min(1).optional(),
    })
    .refine((value) => value.proposalId || value.query, {
      message: 'proposalId ou query requis',
    }),
  execute: async (ctx, input): Promise<unknown> =>
    ctx.runQuery(internal.agent.queries.getProposalDetail, {
      userId: requireUserId(ctx),
      ...(input.proposalId
        ? { proposalId: input.proposalId as Id<'proposals'> }
        : {}),
      ...(input.query ? { query: input.query } : {}),
    }),
})

export const proposalTools = {
  list_proposals: listProposals,
  get_proposal_detail: getProposalDetail,
}
