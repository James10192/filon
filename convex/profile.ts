import { v } from 'convex/values'
import { mutation } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser, type MutationCtx } from './lib/withUser'

/**
 * Domaine : photo de profil (`api.profile.*`).
 *
 * La photo affichee en avatar est stockee dans `users.image` (SOURCE UNIQUE
 * lue par l'UI). Elle vient soit du provider social (Google/GitHub, via le
 * trigger Better Auth `user.onCreate`/`onUpdate` dans `convex/auth.ts`), soit
 * d'un import manuel gere ici. Un import manuel pose `customImage: true` pour
 * que le sync social n'ecrase plus la photo choisie.
 *
 * Multi-tenant strict : chaque mutation commence par `requireUser(ctx)`.
 */

/** Resout la ligne `users` du user courant via l'index `by_authId`. */
async function currentUserDoc(
  ctx: MutationCtx,
  userId: string,
): Promise<Doc<'users'> | null> {
  return ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', userId))
    .unique()
}

/**
 * `api.profile.generateUploadUrl` : URL signee pour televerser un fichier dans
 * Convex storage (le client fait ensuite un PUT direct vers cette URL). Gatee
 * par `requireUser` : seul un utilisateur authentifie peut obtenir une URL.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await requireUser(ctx)
    return ctx.storage.generateUploadUrl()
  },
})

/**
 * `api.profile.setProfileImage` : enregistre la photo importee. Resout l'URL
 * publique du fichier stocke, l'ecrit dans `users.image` et pose
 * `customImage: true` pour proteger ce choix du sync social.
 */
export const setProfileImage = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }): Promise<null> => {
    const { userId, email } = await requireUser(ctx)

    const url = await ctx.storage.getUrl(storageId)
    if (!url) throw new Error('Le fichier importé est introuvable.')

    const doc = await currentUserDoc(ctx, userId)
    if (doc) {
      await ctx.db.patch(doc._id, { image: url, customImage: true })
      return null
    }

    // Cas limite : la ligne metier n'existe pas encore (trigger pas execute).
    await ctx.db.insert('users', {
      authId: userId,
      email,
      image: url,
      customImage: true,
      createdAt: Date.now(),
    })
    return null
  },
})

/**
 * `api.profile.removeProfileImage` : retire la photo importee. On libere le
 * flag `customImage` ; la photo sociale (si un compte Google/GitHub est lie)
 * reprendra la main au prochain sign-in via le trigger `user.onUpdate`. Sans
 * photo sociale, l'avatar repasse aux initiales.
 */
export const removeProfileImage = mutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await currentUserDoc(ctx, userId)
    if (!doc) return null

    // `image: undefined` retire la cle (la photo sociale est re-synchronisee a
    // la prochaine connexion). `customImage: false` rouvre le sync social.
    await ctx.db.patch(doc._id, { image: undefined, customImage: false })
    return null
  },
})
