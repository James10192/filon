import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
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

export const proposalTools = {
  list_proposals: listProposals,
}
