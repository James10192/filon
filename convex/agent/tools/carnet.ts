import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
import { requireUserId } from './shared'

/**
 * Outils du domaine CARNET (entreprises + contacts) : recherche plein texte
 * d'une entreprise par nom, d'un contact par nom/rôle/e-mail. Scopé `userId`,
 * lectures automatiques.
 */

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

export const carnetTools = {
  find_company: findCompany,
  find_contact: findContact,
}
