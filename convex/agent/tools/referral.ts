import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
import { requireUserId } from './shared'

/**
 * Outil du domaine AFFILIATION (parrainage produit Filon). Lecture seule du lien
 * de parrainage et des KPIs (filleuls inscrits/abonnés, mois offerts). Scopé
 * `userId` ; exposé à tous les paliers copilot.
 */

export const referralOverview = createTool({
  description:
    'Vue du parrainage Filon : code/lien de parrainage, nombre de filleuls inscrits et abonnés, mois offerts obtenus et en attente.',
  inputSchema: z.object({}),
  execute: async (ctx): Promise<unknown> =>
    ctx.runQuery(internal.agent.referralReads.referralOverview, {
      userId: requireUserId(ctx),
    }),
})

export const referralTools = {
  referral_overview: referralOverview,
}
