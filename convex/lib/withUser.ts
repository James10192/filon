import type {
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
} from 'convex/server'
import type { DataModel } from '../_generated/dataModel'
import { authComponent } from '../auth'
import {
  aiAccess,
  forbiddenError,
  planOf,
  planLimitError,
  type Plan,
} from './plan'
import type { Doc } from '../_generated/dataModel'

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
export type ActionCtx = GenericActionCtx<DataModel>
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
 * Variante pour une ACTION (pas de `ctx.db`). `safeGetAuthUser` lit l'identité
 * via `ctx.auth`, disponible aussi dans les actions. Utilisée par les actions
 * Paystack (`startCheckout`, `verifyCheckout`).
 */
export async function requireUserFromAction(
  ctx: ActionCtx,
): Promise<AuthedUser> {
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
 * Palier d'abonnement effectif du user courant. Lit la ligne `users` via
 * `by_authId` ; absence de ligne ou de champ `plan` = 'free'. À utiliser dans
 * les mutations gatées pour décider d'appliquer une limite.
 */
export async function currentPlan(ctx: AnyCtx, userId: string): Promise<Plan> {
  const doc = await ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', userId))
    .unique()
  return planOf(doc?.plan ?? null)
}

/**
 * Garde d'accès au copilote IA. Depuis la stratégie « dégustation » (grill-me
 * 2026-06-15), tous les paliers ont une allocation de crédits, donc cette garde
 * passe pour tout le monde ; elle ne throw que pour un éventuel palier futur sans
 * allocation. Le vrai mur est le SOLDE de crédits (pré-contrôle dans sendMessage),
 * pas le palier. Retourne le palier effectif.
 */
export async function requireCopilot(
  ctx: AnyCtx,
  userId: string,
): Promise<Plan> {
  const plan = await currentPlan(ctx, userId)
  if (!aiAccess(plan)) {
    // ConvexError (pas Error brute) : sinon le message est masqué en prod.
    throw planLimitError('Le copilote IA n’est pas disponible sur ce palier.')
  }
  return plan
}

/**
 * Allowlist d'e-mails administrateurs, lue depuis `process.env.ADMIN_EMAILS`
 * (liste séparée par virgules). Normalisée (trim, lowercase). Permet d'accorder
 * l'accès /admin sans poser `users.role` en base (utile pour le compte de Marcel).
 */
function adminAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? ''
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0),
  )
}

/** Résout la ligne `users` applicative du user courant (ou null). */
async function userDocOf(
  ctx: AnyCtx,
  userId: string,
): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', userId))
    .unique()
}

/**
 * Le user courant est-il administrateur ? Vrai si `users.role === 'admin'` OU si
 * son e-mail figure dans l'allowlist `ADMIN_EMAILS`. Ne throw jamais : renvoie
 * `false` pour un visiteur non authentifié. Sert au guard de route et à l'entrée
 * de sidebar côté client (query publique `admin.amIAdmin`).
 */
export async function isAdmin(ctx: AnyCtx): Promise<boolean> {
  const authUser = await authComponent.safeGetAuthUser(ctx)
  if (!authUser) return false
  const userId = authUser._id
  const email = ((authUser as { email?: string }).email ?? '').toLowerCase()
  if (email && adminAllowlist().has(email)) return true
  const doc = await userDocOf(ctx, userId)
  return doc?.role === 'admin'
}

/**
 * Garde d'accès au back-office /admin. Résout le user courant, vérifie qu'il est
 * administrateur (`role === 'admin'` ou e-mail dans `ADMIN_EMAILS`). Throw une
 * `ConvexError` `FORBIDDEN` sinon. À appeler en tête de TOUTE fonction admin :
 * c'est le SEUL endroit autorisé à lire en cross-tenant (sans scope `userId`).
 */
export async function requireAdmin(ctx: AnyCtx): Promise<AuthedUser> {
  const authUser = await authComponent.safeGetAuthUser(ctx)
  if (!authUser) {
    throw forbiddenError()
  }
  const userId = authUser._id
  const email = ((authUser as { email?: string }).email ?? '').toLowerCase()
  const allowed = email && adminAllowlist().has(email)
  if (!allowed) {
    const doc = await userDocOf(ctx, userId)
    if (doc?.role !== 'admin') {
      throw forbiddenError()
    }
  }
  return { userId, email }
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
