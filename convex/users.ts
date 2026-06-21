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
/**
 * Mappe un profil d'activite (`activityType`) vers le jeu d'etiquettes de
 * pipeline a afficher. Ne change jamais les cles internes du pipeline : pilote
 * uniquement les libelles affiches cote front.
 *  - 'recruteur'                                  -> 'recrutement'
 *  - 'commercial'/'freelance_dev'/'consultant'/
 *    'ambassadeur'/'agent_immo'/'agent_assurance'/
 *    'autre'                                      -> 'vente'
 *  - 'etudiant' / absent / inconnu               -> 'emploi' (defaut)
 */
function stageLabelSetForActivity(
  activityType: string,
): 'emploi' | 'vente' | 'recrutement' {
  if (activityType === 'recruteur') return 'recrutement'
  if (
    activityType === 'commercial' ||
    activityType === 'freelance_dev' ||
    activityType === 'consultant' ||
    activityType === 'ambassadeur' ||
    activityType === 'agent_immo' ||
    activityType === 'agent_assurance' ||
    activityType === 'autre'
  ) {
    return 'vente'
  }
  return 'emploi'
}

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
      activityType: undefined as string | undefined,
      stageLabelSet: undefined as
        | 'emploi'
        | 'vente'
        | 'recrutement'
        | undefined,
      onboardedAt: undefined as number | undefined,
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

/**
 * Cree la ligne `users` du user courant si elle n'existe pas encore (cas limite
 * post-inscription, avant l'execution du trigger Better Auth). Retourne le doc.
 * Factorise le filet de securite utilise par les mutations d'onboarding.
 */
async function ensureUserDoc(
  ctx: MutationCtx,
  userId: string,
  email: string,
): Promise<Doc<'users'>> {
  const doc = await currentUserDoc(ctx, userId)
  if (doc) return doc
  const id = await ctx.db.insert('users', {
    authId: userId,
    email,
    createdAt: Date.now(),
  })
  const created = await ctx.db.get(id)
  if (!created) throw validationError('Profil introuvable après création')
  return created
}

/**
 * `api.users.setActivity` : enregistre le profil d'activite declare a
 * l'onboarding (ex 'freelance_dev', 'ambassadeur', 'agent_immo'...). Libre
 * (string) pour rester flexible. Le pre-remplissage des etiquettes/sources par
 * defaut est pilote cote front a partir de cette valeur. Ne pose PAS `onboardedAt`
 * (voir `completeOnboarding`). Cree la ligne si absente.
 */
export const setActivity = mutation({
  args: { activityType: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const { userId, email } = await requireUser(ctx)
    const activityType = args.activityType.trim()
    if (!activityType) throw validationError('Le type d’activité est requis')

    const doc = await ensureUserDoc(ctx, userId, email)
    await ctx.db.patch(doc._id, {
      activityType,
      stageLabelSet: stageLabelSetForActivity(activityType),
    })
    return null
  },
})

/**
 * `api.users.setStageLabelSet` : change le jeu d'etiquettes de pipeline affiche
 * (persona lens), pilote depuis « Mon espace » (Parametres). N'altere PAS les
 * cles internes du pipeline : seul l'affichage des libelles change. Owner-scope
 * via `requireUser`/`ensureUserDoc`. Cree la ligne si absente.
 */
export const setStageLabelSet = mutation({
  args: {
    set: v.union(
      v.literal('emploi'),
      v.literal('vente'),
      v.literal('recrutement'),
    ),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId, email } = await requireUser(ctx)
    const doc = await ensureUserDoc(ctx, userId, email)
    await ctx.db.patch(doc._id, { stageLabelSet: args.set })
    return null
  },
})

/**
 * `api.users.completeOnboarding` : marque l'onboarding comme termine
 * (`onboardedAt = maintenant`). Accepte optionnellement `activityType` pour le
 * poser dans le meme appel. Idempotent : ne re-ecrit pas `onboardedAt` s'il
 * existe deja. Cree la ligne si absente.
 */
export const completeOnboarding = mutation({
  args: { activityType: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    const { userId, email } = await requireUser(ctx)
    const doc = await ensureUserDoc(ctx, userId, email)

    const patch: {
      onboardedAt?: number
      activityType?: string
      stageLabelSet?: 'emploi' | 'vente' | 'recrutement'
    } = {}
    if (!doc.onboardedAt) patch.onboardedAt = Date.now()
    if (args.activityType !== undefined) {
      const activityType = args.activityType.trim()
      if (activityType) {
        patch.activityType = activityType
        patch.stageLabelSet = stageLabelSetForActivity(activityType)
      }
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(doc._id, patch)
    }
    return null
  },
})
