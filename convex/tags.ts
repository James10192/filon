import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './lib/withUser'
import { optionalUser, requireUser } from './lib/withUser'
import { forbiddenError, notFoundError, validationError } from './lib/plan'

/**
 * Domaine : catalogue d'etiquettes par utilisateur (`api.tags.*`).
 *
 * SOURCE du select/combobox d'etiquettes (avec creation inline) cote front. Les
 * opportunites et contacts ne stockent QUE les NOMS dans leur array `tags` ;
 * cette table porte la couleur et garantit un vocabulaire coherent (plus de
 * texte libre divergent).
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser(ctx)` et scope
 * via un index `by_user*`. Toute ecriture force `userId` cote serveur.
 */

/** Charge une etiquette et verifie qu'elle appartient au user courant. */
async function getOwnedTag(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  id: Id<'tags'>,
): Promise<Doc<'tags'>> {
  const tag = await ctx.db.get(id)
  if (!tag) throw notFoundError('Étiquette introuvable')
  if (tag.userId !== userId) throw forbiddenError('Non autorisé')
  return tag
}

/** Resout une etiquette du user par son nom exact (index `by_user_name`). */
async function findByName(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  name: string,
): Promise<Doc<'tags'> | null> {
  return ctx.db
    .query('tags')
    .withIndex('by_user_name', (q) => q.eq('userId', userId).eq('name', name))
    .unique()
}

/**
 * `api.tags.list` : catalogue d'etiquettes du user, tri alphabetique (fr).
 * Ne throw pas si vide (renvoie un tableau vide).
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx)
    if (!user) return []
    const { userId } = user
    const tags = await ctx.db
      .query('tags')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    return tags.sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    )
  },
})

/**
 * `api.tags.createTag` : cree une etiquette de maniere IDEMPOTENTE. Si une
 * etiquette du meme nom existe deja (insensible a la casse via comparaison sur
 * le nom normalise stocke), renvoie l'existante sans la recreer. Sinon insere et
 * renvoie l'id. C'est l'API appelee par la creation inline du combobox.
 */
export const createTag = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<'tags'>> => {
    const { userId } = await requireUser(ctx)
    const name = args.name.trim()
    if (!name) throw validationError('Le nom de l’étiquette est requis')

    const existing = await findByName(ctx, userId, name)
    if (existing) {
      // Idempotent : on complete eventuellement la couleur si absente.
      if (args.color?.trim() && !existing.color) {
        await ctx.db.patch(existing._id, { color: args.color.trim() })
      }
      return existing._id
    }

    const doc: {
      userId: string
      name: string
      createdAt: number
      color?: string
    } = { userId, name, createdAt: Date.now() }
    if (args.color?.trim()) doc.color = args.color.trim()

    return ctx.db.insert('tags', doc)
  },
})

/**
 * `api.tags.ensureTags` : garantit la presence d'une LISTE de noms d'etiquettes
 * dans le catalogue (idempotent). Renvoie les noms normalises (trim, dedupes)
 * effectivement utilisables. Sert aux mutations opportunites/contacts qui
 * recoivent un array `tags` : on s'assure que chaque nom existe au catalogue.
 */
export const ensureTags = mutation({
  args: { names: v.array(v.string()) },
  handler: async (ctx, args): Promise<string[]> => {
    const { userId } = await requireUser(ctx)
    return ensureTagsForUser(ctx, userId, args.names)
  },
})

/**
 * Helper serveur (reutilisable inter-domaines) : pour chaque nom non vide,
 * cree l'etiquette au catalogue si absente. Renvoie la liste des noms normalises
 * (trim) dedupliquee, dans l'ordre d'apparition. Ne throw pas sur un nom vide
 * (il est simplement ignore).
 */
export async function ensureTagsForUser(
  ctx: MutationCtx,
  userId: string,
  names: string[],
): Promise<string[]> {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of names) {
    const name = raw.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(name)
    const existing = await findByName(ctx, userId, name)
    if (!existing) {
      await ctx.db.insert('tags', { userId, name, createdAt: Date.now() })
    }
  }
  return result
}

/**
 * `api.tags.renameTag` : renomme une etiquette du catalogue. Verifie la
 * propriete et l'absence de collision avec un autre nom. Ne propage PAS le
 * renommage dans les array `tags` des opportunites/contacts (au choix du front).
 */
export const renameTag = mutation({
  args: { id: v.id('tags'), name: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    await getOwnedTag(ctx, userId, args.id)
    const name = args.name.trim()
    if (!name) throw validationError('Le nom de l’étiquette est requis')

    const collision = await findByName(ctx, userId, name)
    if (collision && collision._id !== args.id) {
      throw validationError('Une étiquette porte déjà ce nom')
    }
    await ctx.db.patch(args.id, { name })
    return null
  },
})

/**
 * `api.tags.updateColor` : change la couleur d'une etiquette. `null`/vide efface
 * la couleur. Verifie la propriete.
 */
export const updateColor = mutation({
  args: { id: v.id('tags'), color: v.optional(v.string()) },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    await getOwnedTag(ctx, userId, args.id)
    const color = args.color?.trim()
    await ctx.db.patch(args.id, { color: color ? color : undefined })
    return null
  },
})

/**
 * `api.tags.deleteTag` : supprime une etiquette du catalogue. Verifie la
 * propriete. Ne nettoie PAS les array `tags` des opportunites/contacts (un nom
 * orphelin reste affichable ; le front peut le re-creer ou l'ignorer).
 */
export const deleteTag = mutation({
  args: { id: v.id('tags') },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    await getOwnedTag(ctx, userId, args.id)
    await ctx.db.delete(args.id)
    return null
  },
})
