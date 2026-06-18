import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser, type MutationCtx, type QueryCtx } from './lib/withUser'
import { validationError } from './lib/plan'

/**
 * Domaine : profil applicatif (`api.users.*`).
 *
 * La ligne `users` est alimentee par le trigger Better Auth `user.onCreate`
 * (cf. `convex/auth.ts`). `authId` = identifiant Better Auth, c'est aussi la
 * valeur de `userId` qui scope toutes les tables metier.
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser(ctx)` et lit
 * la ligne du user courant via l'index `by_authId`. Aucune lecture/ecriture
 * sans filtre `userId`.
 */

/**
 * Resout la ligne `users` du user courant via l'index `by_authId`. Retourne
 * `null` si le trigger `onCreate` n'a pas encore cree la ligne (cas limite juste
 * apres l'inscription) : l'appelant compose alors avec l'identite d'auth.
 */
async function currentUserDoc(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', userId))
    .unique()
}

/**
 * `api.users.me` : profil du user courant. Retourne un objet profil (jamais
 * `undefined` pour les consommateurs cote client) compose de la ligne `users`
 * et, a defaut, de l'e-mail porte par l'identite d'authentification. Ne throw
 * pas : si la session est absente, retourne `null`.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await (async () => {
      try {
        return await requireUser(ctx)
      } catch {
        return null
      }
    })()
    if (!authUser) return null

    const doc = await currentUserDoc(ctx, authUser.userId)
    if (doc) return doc

    // Filet de securite : la ligne metier n'existe pas encore (trigger pas
    // encore execute). On expose au moins l'e-mail de l'identite d'auth.
    return {
      authId: authUser.userId,
      email: authUser.email,
      name: undefined as string | undefined,
      headline: undefined as string | undefined,
      image: undefined as string | undefined,
      customImage: undefined as boolean | undefined,
      createdAt: Date.now(),
    }
  },
})

/**
 * `api.users.updateProfile` : met a jour le profil du user courant (nom,
 * accroche). N'inclut jamais de champ `undefined` dans le patch. Cree la ligne
 * si elle n'existe pas encore (cas limite post-inscription).
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    headline: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId, email } = await requireUser(ctx)
    const doc = await currentUserDoc(ctx, userId)

    const patch: { name?: string; headline?: string } = {}
    if (args.name !== undefined) {
      const name = args.name.trim()
      if (!name) throw validationError('Le nom est requis')
      patch.name = name
    }
    if (args.headline !== undefined) {
      const headline = args.headline.trim()
      patch.headline = headline ? headline : undefined
    }

    if (doc) {
      await ctx.db.patch(doc._id, patch)
      return null
    }

    // La ligne metier n'existe pas encore : on la cree avec les champs fournis.
    const created: {
      authId: string
      email: string
      createdAt: number
      name?: string
      headline?: string
    } = { authId: userId, email, createdAt: Date.now() }
    if (patch.name !== undefined) created.name = patch.name
    if (patch.headline !== undefined) created.headline = patch.headline

    await ctx.db.insert('users', created)
    return null
  },
})
