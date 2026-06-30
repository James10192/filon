import { ConvexError, v } from 'convex/values'
import { internalMutation, mutation } from './_generated/server'
import { requireUser } from './lib/withUser'

function validationError(
  message: string,
): ConvexError<{ kind: 'VALIDATION'; message: string }> {
  return new ConvexError({ kind: 'VALIDATION', message })
}

const levelValidator = v.union(
  v.literal('info'),
  v.literal('warning'),
  v.literal('error'),
)

type ErrorDocArgs = {
  userId?: string
  source: 'client' | 'server'
  feature: string
  action: string
  message: string
  level: 'info' | 'warning' | 'error'
  route?: string
  metadata?: string
}

async function insertError(
  ctx: { db: any },
  args: ErrorDocArgs,
): Promise<null> {
  const doc: Record<string, unknown> = {
    source: args.source,
    feature: args.feature,
    action: args.action,
    message: args.message,
    level: args.level,
    createdAt: Date.now(),
  }
  if (args.userId !== undefined) doc.userId = args.userId
  if (args.route !== undefined) doc.route = args.route
  if (args.metadata !== undefined) doc.metadata = args.metadata
  await ctx.db.insert('appErrors', doc)
  return null
}

export const logServerError = internalMutation({
  args: {
    userId: v.optional(v.string()),
    feature: v.string(),
    action: v.string(),
    message: v.string(),
    level: levelValidator,
    route: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> =>
    insertError(ctx, { ...args, source: 'server' }),
})

export const reportClientError = mutation({
  args: {
    feature: v.string(),
    action: v.string(),
    message: v.string(),
    level: v.optional(levelValidator),
    route: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const message = args.message.trim()
    if (!message) throw validationError("Le message d'erreur est requis.")
    return insertError(ctx, {
      userId,
      source: 'client',
      feature: args.feature,
      action: args.action,
      message,
      level: args.level ?? 'error',
      ...(args.route !== undefined ? { route: args.route } : {}),
      ...(args.metadata !== undefined ? { metadata: args.metadata } : {}),
    })
  },
})

