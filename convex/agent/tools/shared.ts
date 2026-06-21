import { internal } from '../../_generated/api'
import { authError } from '../../lib/plan'

/**
 * Primitives partagées des outils du copilote (lecture + écriture), factorisées
 * pour ne pas être copiées dans chaque fichier de domaine :
 *  - `requireUserId` : garde l'identité utilisateur posée sur le ToolCtx.
 *  - `canRun` / `approval` : flux d'approbation des écritures (mode + alwaysAllow).
 *  - `logAction` : journalisation d'une écriture exécutée (audit + lien entité).
 *
 * Toute la logique métier (mutations/queries internes scopées `userId`) reste
 * dans les fichiers de domaine ; ici, seules les briques transverses.
 */

type PermMode = 'ask' | 'accept' | 'auto' | 'bypass'

export type ApprovalRequired = {
  approvalRequired: true
  tool: string
  summary: string
}

/** Identité utilisateur du ToolCtx (posée par l'action du copilote). */
export function requireUserId(ctx: { userId?: string }): string {
  if (!ctx.userId) throw authError('Contexte utilisateur manquant')
  return ctx.userId
}

/** Décide si une écriture peut s'exécuter selon le mode + alwaysAllow. */
export async function canRun(
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

export function approval(tool: string, summary: string): ApprovalRequired {
  return { approvalRequired: true, tool, summary }
}

/**
 * Journalise une écriture exécutée dans `aiActions` (audit + lien entité). Args
 * construits dynamiquement (jamais d'`undefined` passé à Convex). `threadId` est
 * lu sur le contexte d'outil quand l'agent l'expose.
 */
export async function logAction(
  ctx: {
    userId?: string
    threadId?: string
    runMutation: (ref: any, args: any) => Promise<any>
  },
  opts: { tool: string; summary: string; entityType?: string; entityId?: string },
): Promise<void> {
  const args: Record<string, unknown> = {
    userId: requireUserId(ctx),
    tool: opts.tool,
    summary: opts.summary,
  }
  if (ctx.threadId) args.threadId = ctx.threadId
  if (opts.entityType) args.entityType = opts.entityType
  if (opts.entityId) args.entityId = opts.entityId
  await ctx.runMutation(internal.aiChat.logAction, args)
}
