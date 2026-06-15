import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser } from './lib/withUser'

/**
 * Domaine notifications · centre de notifications in-app (scope strict `userId`).
 *
 * Alimenté par le cycle de renouvellement d'abonnement (Axe 2) : relance
 * d'échéance, succès/échec d'auto-débit carte, downgrade gracieux. Les writes
 * passent par une `internalMutation` (le client ne crée jamais de notification
 * lui-même : seuls le cron et le webhook le font). Le client peut LIRE les
 * siennes et les marquer lues.
 *
 * L'e-mail réel est optionnel : si un provider (Resend) est configuré, un futur
 * relais consommera `emailSent === false`. En attendant, tout le contenu reste
 * consultable in-app, donc aucune relance n'est « perdue ».
 */

const kindValidator = v.union(
  v.literal('renewal_reminder'),
  v.literal('renewal_charged'),
  v.literal('renewal_failed'),
  v.literal('downgraded'),
)

/** Garde-fou anti-flood sur la liste renvoyée au client. */
const LIST_LIMIT = 50

/**
 * `api.notifications.list` : notifications du user courant, plus récentes
 * d'abord. Ne throw pas hors session (renvoie une liste vide) pour rester
 * sûre à appeler depuis n'importe quel écran (cloche, encart Tarifs).
 */
export const list = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<Array<Doc<'notifications'>>> => {
    const authUser = await (async () => {
      try {
        return await requireUser(ctx)
      } catch {
        return null
      }
    })()
    if (!authUser) return []
    return ctx.db
      .query('notifications')
      .withIndex('by_user_created', (q) => q.eq('userId', authUser.userId))
      .order('desc')
      .take(LIST_LIMIT)
  },
})

/**
 * `api.notifications.unreadCount` : compteur non lues, pour un badge de cloche.
 * Borné via l'index `by_user_read` (pas de scan global).
 */
export const unreadCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const authUser = await (async () => {
      try {
        return await requireUser(ctx)
      } catch {
        return null
      }
    })()
    if (!authUser) return 0
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) =>
        q.eq('userId', authUser.userId).eq('read', false),
      )
      .take(LIST_LIMIT)
    return unread.length
  },
})

/** `api.notifications.markRead` : marque une notification du user comme lue. */
export const markRead = mutation({
  args: { id: v.id('notifications') },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await ctx.db.get(args.id)
    // Scope : on ne touche que les notifications du user courant.
    if (!doc || doc.userId !== userId) {
      throw new Error('Notification introuvable')
    }
    if (!doc.read) await ctx.db.patch(args.id, { read: true })
    return null
  },
})

/** `api.notifications.markAllRead` : marque toutes les non lues comme lues. */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx): Promise<{ marked: number }> => {
    const { userId } = await requireUser(ctx)
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) =>
        q.eq('userId', userId).eq('read', false),
      )
      .take(LIST_LIMIT)
    for (const doc of unread) await ctx.db.patch(doc._id, { read: true })
    return { marked: unread.length }
  },
})

/**
 * `internal.notifications.create` : crée une notification in-app. Appelée par le
 * cron de renouvellement et le webhook. Patch dynamique : jamais `undefined`
 * injecté (actionUrl/meta omis si absents). `read`/`emailSent` à false par défaut.
 */
export const create = internalMutation({
  args: {
    userId: v.string(),
    kind: kindValidator,
    title: v.string(),
    body: v.string(),
    actionUrl: v.optional(v.string()),
    meta: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const doc: {
      userId: string
      kind: typeof args.kind
      title: string
      body: string
      actionUrl?: string
      meta?: string
      read: boolean
      emailSent: boolean
      createdAt: number
    } = {
      userId: args.userId,
      kind: args.kind,
      title: args.title,
      body: args.body,
      read: false,
      emailSent: false,
      createdAt: Date.now(),
    }
    if (args.actionUrl !== undefined) doc.actionUrl = args.actionUrl
    if (args.meta !== undefined) doc.meta = args.meta
    await ctx.db.insert('notifications', doc)
    return null
  },
})
