import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireUser } from './lib/withUser'

/**
 * Domaine feedback · soumission depuis le widget in-app.
 *
 * Multi-tenant strict côté soumission : chaque feedback porte le `userId` du
 * soumetteur. La LECTURE (back-office) vit dans `convex/admin.ts`, gatée par
 * `requireAdmin` (seul endroit autorisé à lire en cross-tenant).
 */

const typeValidator = v.union(
  v.literal('bug'),
  v.literal('idea'),
  v.literal('other'),
)

/**
 * Soumet un feedback (statut initial `new`). `context` = chemin de la page d'où
 * le widget a été ouvert (debug). Le message est trimé et doit être non vide.
 */
export const submit = mutation({
  args: {
    type: typeValidator,
    message: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const message = args.message.trim()
    if (message.length === 0) {
      throw new Error('Le message ne peut pas être vide.')
    }

    // Objet construit dynamiquement : jamais d'`undefined` vers Convex.
    const doc: {
      userId: string
      type: typeof args.type
      message: string
      status: 'new'
      createdAt: number
      context?: string
    } = {
      userId,
      type: args.type,
      message,
      status: 'new',
      createdAt: Date.now(),
    }
    const context = args.context?.trim()
    if (context) doc.context = context

    return ctx.db.insert('feedback', doc)
  },
})
