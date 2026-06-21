import { z } from 'zod'
import { createTool } from '@convex-dev/agent'
import { internal } from '../../_generated/api'
import type { Id } from '../../_generated/dataModel'
import { approval, canRun, logAction, requireUserId } from './shared'
import { requireManagerOrg } from './ctx'

/**
 * Outils du domaine ÉQUIPE (manager : admin/head_sell). Lecture composite de
 * l'aperçu d'équipe + écritures gouvernées de pointage de priorité. Le rôle
 * manager est revalidé côté serveur (helper `requireManagerOrg` + mutations
 * `lib/flagPriority`). L'exposition est gated par le manifeste (admin/head_sell).
 */

export const teamOverview = createTool({
  description:
    "Aperçu de l'équipe (réservé au head sell / admin) : métriques par membre, totaux de l'organisation et opportunités pointées prioritaires à traiter.",
  inputSchema: z.object({}),
  execute: async (ctx): Promise<unknown> => {
    const { role } = await requireManagerOrg(ctx)
    return ctx.runQuery(internal.agent.orgReads.teamOverview, {
      userId: requireUserId(ctx),
      role,
    })
  },
})

export const flagPriority = createTool({
  description:
    "Pointe une opportunité d'un membre de l'équipe comme prioritaire (réservé au head sell / admin). Notifie le propriétaire.",
  inputSchema: z.object({
    opportunityId: z.string().min(1),
    note: z.string().optional(),
  }),
  execute: async (ctx, input): Promise<unknown> => {
    await requireManagerOrg(ctx)
    if (!(await canRun(ctx, 'flag_priority'))) {
      return approval('flag_priority', 'Pointer cette opportunité comme prioritaire')
    }
    const args: { userId: string; opportunityId: Id<'opportunities'>; note?: string } = {
      userId: requireUserId(ctx),
      opportunityId: input.opportunityId as Id<'opportunities'>,
    }
    if (input.note?.trim()) args.note = input.note.trim()
    const res = (await ctx.runMutation(
      internal.agent.govWrites.flagPriority,
      args,
    )) as { title: string }
    await logAction(ctx, {
      tool: 'flag_priority',
      summary: `Priorité pointée sur « ${res.title} »`,
      entityType: 'opportunity',
      entityId: input.opportunityId,
    })
    return res
  },
})

export const unflagPriority = createTool({
  description:
    "Retire le pointage prioritaire d'une opportunité (réservé au head sell / admin).",
  inputSchema: z.object({ opportunityId: z.string().min(1) }),
  execute: async (ctx, input): Promise<unknown> => {
    await requireManagerOrg(ctx)
    if (!(await canRun(ctx, 'unflag_priority'))) {
      return approval('unflag_priority', 'Retirer le pointage prioritaire')
    }
    const res = (await ctx.runMutation(internal.agent.govWrites.unflagPriority, {
      userId: requireUserId(ctx),
      opportunityId: input.opportunityId as Id<'opportunities'>,
    })) as { title: string }
    await logAction(ctx, {
      tool: 'unflag_priority',
      summary: `Pointage retiré de « ${res.title} »`,
      entityType: 'opportunity',
      entityId: input.opportunityId,
    })
    return res
  },
})

export const teamTools = {
  team_overview: teamOverview,
  flag_priority: flagPriority,
  unflag_priority: unflagPriority,
}
