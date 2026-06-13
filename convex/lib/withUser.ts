import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server'
import type { DataModel } from '../_generated/dataModel'
import { authComponent } from '../auth'

/**
 * Contexte d'un utilisateur authentifié.
 *
 * `userId` = identifiant Better Auth de l'utilisateur courant (string). C'est
 * la valeur portée par la colonne `userId` de toutes les tables métier et
 * utilisée pour scoper les index `by_user*`.
 */
export type AuthedUser = {
  userId: string
  email: string
}

export type QueryCtx = GenericQueryCtx<DataModel>
export type MutationCtx = GenericMutationCtx<DataModel>
export type AnyCtx = QueryCtx | MutationCtx

/**
 * Résout l'utilisateur Better Auth courant et retourne son identité applicative.
 * Throw si non authentifié. À appeler en tête de chaque query/mutation métier.
 *
 * @example
 * export const list = query({
 *   args: {},
 *   handler: async (ctx) => {
 *     const { userId } = await requireUser(ctx)
 *     return ctx.db
 *       .query('opportunities')
 *       .withIndex('by_user', (q) => q.eq('userId', userId))
 *       .collect()
 *   },
 * })
 */
export async function requireUser(ctx: AnyCtx): Promise<AuthedUser> {
  const authUser = await authComponent.safeGetAuthUser(ctx)
  if (!authUser) {
    throw new Error('Non authentifié')
  }
  return {
    userId: authUser._id,
    email: (authUser as { email?: string }).email ?? '',
  }
}

/**
 * Variante "wrapper" pour une QUERY : exécute `fn` avec le contexte enrichi de
 * l'identité utilisateur. Throw si non authentifié.
 *
 * @example
 * export const list = query({
 *   args: {},
 *   handler: (ctx) =>
 *     withUserQuery(ctx, ({ db, userId }) =>
 *       db.query('opportunities')
 *         .withIndex('by_user', (q) => q.eq('userId', userId))
 *         .collect(),
 *     ),
 * })
 */
export async function withUserQuery<T>(
  ctx: QueryCtx,
  fn: (ctx: QueryCtx & AuthedUser) => Promise<T>,
): Promise<T> {
  const user = await requireUser(ctx)
  return fn(Object.assign(ctx, user))
}

/**
 * Variante "wrapper" pour une MUTATION : exécute `fn` avec le contexte enrichi
 * de l'identité utilisateur. Throw si non authentifié.
 */
export async function withUserMutation<T>(
  ctx: MutationCtx,
  fn: (ctx: MutationCtx & AuthedUser) => Promise<T>,
): Promise<T> {
  const user = await requireUser(ctx)
  return fn(Object.assign(ctx, user))
}
