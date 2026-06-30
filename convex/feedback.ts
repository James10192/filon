import { ConvexError, v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireUser } from './lib/withUser'

/**
 * Domaine feedback · soumission depuis le widget in-app.
 *
 * Multi-tenant strict côté soumission : chaque feedback porte le `userId` du
 * soumetteur. La lecture cross-tenant reste réservée au back-office admin.
 */

const typeValidator = v.union(
  v.literal('bug'),
  v.literal('idea'),
  v.literal('other'),
)

const priorityValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
)

function validationError(
  message: string,
): ConvexError<{ kind: 'VALIDATION'; message: string }> {
  return new ConvexError({ kind: 'VALIDATION', message })
}

/**
 * Soumet un feedback enrichi. En plus du message, on capture le contexte
 * d'usage nécessaire au triage produit : page, navigateur, viewport, plan, etc.
 */
export const submit = mutation({
  args: {
    type: typeValidator,
    message: v.string(),
    context: v.optional(v.string()),
    pageTitle: v.optional(v.string()),
    browser: v.optional(v.string()),
    viewport: v.optional(v.string()),
    userPlan: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    screenshotUrl: v.optional(v.string()),
    canContactBack: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const message = args.message.trim()
    if (message.length === 0) {
      throw validationError('Le message ne peut pas être vide.')
    }

    const doc: {
      userId: string
      type: typeof args.type
      message: string
      status: 'new'
      createdAt: number
      context?: string
      pageTitle?: string
      browser?: string
      viewport?: string
      userPlan?: string
      organizationId?: string
      entityType?: string
      entityId?: string
      priority?: 'low' | 'medium' | 'high'
      screenshotUrl?: string
      canContactBack?: boolean
    } = {
      userId,
      type: args.type,
      message,
      status: 'new',
      createdAt: Date.now(),
    }

    const context = args.context?.trim()
    if (context) doc.context = context
    const pageTitle = args.pageTitle?.trim()
    if (pageTitle) doc.pageTitle = pageTitle
    const browser = args.browser?.trim()
    if (browser) doc.browser = browser
    const viewport = args.viewport?.trim()
    if (viewport) doc.viewport = viewport
    const userPlan = args.userPlan?.trim()
    if (userPlan) doc.userPlan = userPlan
    const organizationId = args.organizationId?.trim()
    if (organizationId) doc.organizationId = organizationId
    const entityType = args.entityType?.trim()
    if (entityType) doc.entityType = entityType
    const entityId = args.entityId?.trim()
    if (entityId) doc.entityId = entityId
    if (args.priority !== undefined) doc.priority = args.priority
    const screenshotUrl = args.screenshotUrl?.trim()
    if (screenshotUrl) doc.screenshotUrl = screenshotUrl
    if (args.canContactBack !== undefined) {
      doc.canContactBack = args.canContactBack
    }

    return ctx.db.insert('feedback', doc)
  },
})

