import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
import { approval, canRun, logAction, requireUserId } from './shared'

/**
 * Outils du domaine RÉSEAU (wedge marketing relationnel). Lecture de la
 * progression vers l'objectif de palier (dérivée du pipeline + filleuls) et
 * écriture gouvernée de l'objectif. Scopé `userId` ; exposé à tous les paliers
 * copilot (cf. manifeste).
 */

export const networkStatus = createTool({
  description:
    "Progression vers l'objectif de palier réseau : nombre de filleuls actifs / à risque, ce qu'il manque pour le palier, et les opportunités avancées à convertir.",
  inputSchema: z.object({}),
  execute: async (ctx): Promise<unknown> =>
    ctx.runQuery(internal.agent.networkReads.networkStatus, {
      userId: requireUserId(ctx),
    }),
})

export const setRankGoal = createTool({
  description:
    "Définit l'objectif de palier réseau de l'utilisateur (un intitulé et/ou un nombre de filleuls actifs visé).",
  inputSchema: z.object({
    label: z.string().optional(),
    targetActives: z.number().int().positive().optional(),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    if (!(await canRun(ctx, 'set_rank_goal'))) {
      const summary = input.label
        ? `Définir l’objectif de palier « ${input.label} »`
        : "Définir l’objectif de palier réseau"
      return approval('set_rank_goal', summary)
    }
    const args: { userId: string; label?: string; targetActives?: number } = {
      userId: requireUserId(ctx),
    }
    if (input.label?.trim()) args.label = input.label.trim()
    if (typeof input.targetActives === 'number') {
      args.targetActives = input.targetActives
    }
    const res = (await ctx.runMutation(
      internal.agent.govWrites.setRankGoal,
      args,
    )) as { goalLabel: string | null; target: number | null }
    await logAction(ctx, {
      tool: 'set_rank_goal',
      summary: res.goalLabel
        ? `Objectif de palier « ${res.goalLabel} » défini`
        : 'Objectif de palier mis à jour',
    })
    return res
  },
})

export const networkTools = {
  network_status: networkStatus,
  set_rank_goal: setRankGoal,
}
