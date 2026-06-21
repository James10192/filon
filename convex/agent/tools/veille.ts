import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
import { requireUserId } from './shared'

/**
 * Outil du domaine VEILLE. Lecture seule : veilles enregistrées + captures
 * récentes (opportunités détectées) avec leur stade. PAS d'import de capture
 * (hors périmètre v1). Scopé `userId` ; exposé à tous les paliers copilot.
 */

export const veilleDigest = createTool({
  description:
    'Récap de la veille : mots-clés surveillés et opportunités récemment captées, avec leur devenir dans le pipeline (captées / actives / gagnées / perdues).',
  inputSchema: z.object({
    limit: z.number().int().positive().max(20).optional(),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    const args: { userId: string; limit?: number } = {
      userId: requireUserId(ctx),
    }
    if (typeof input.limit === 'number') args.limit = input.limit
    return ctx.runQuery(internal.agent.veilleReads.veilleDigest, args)
  },
})

export const veilleTools = {
  veille_digest: veilleDigest,
}
