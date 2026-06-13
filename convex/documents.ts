import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { requireUser, type MutationCtx, type QueryCtx } from './lib/withUser'

/**
 * Domaine : bibliotheque de documents (`api.documents.*`).
 *
 * Stockage des fichiers via Convex storage. Le flux d'upload se fait en trois
 * temps cote client : (1) `generateUploadUrl` renvoie une URL signee, (2) le
 * client POST le fichier vers cette URL et recupere un `storageId`, (3)
 * `create` enregistre le document (metadonnees + `storageId`).
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser(ctx)` et
 * scope via un index `by_user*`. Toute ecriture force `userId` a la valeur du
 * user courant (jamais depuis les args du client). Avant tout patch/delete ou
 * lecture par id, on verifie `doc.userId === userId` sinon `Non autorise`.
 */

const docKind = v.union(
  v.literal('cv'),
  v.literal('lettre'),
  v.literal('portfolio'),
  v.literal('contrat'),
  v.literal('autre'),
)

type DocKind = 'cv' | 'lettre' | 'portfolio' | 'contrat' | 'autre'

/** Charge un document en verifiant qu'il appartient au user courant. */
async function getOwnedDocument(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  id: Id<'documents'>,
): Promise<Doc<'documents'>> {
  const doc = await ctx.db.get(id)
  if (!doc) {
    throw new Error('Introuvable')
  }
  if (doc.userId !== userId) {
    throw new Error('Non autorise')
  }
  return doc
}

/**
 * Genere une URL d'upload Convex storage a usage unique. Exige un user
 * authentifie. Le client POST le fichier vers cette URL puis appelle `create`
 * avec le `storageId` retourne.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await requireUser(ctx)
    return ctx.storage.generateUploadUrl()
  },
})

/**
 * Liste des documents du user, eventuellement filtres par type ou par
 * opportunite, tries par `createdAt desc`. Chaque document est enrichi de son
 * `url` resolue via `ctx.storage.getUrl(storageId)` (null si le blob a disparu).
 */
export const list = query({
  args: {
    kind: v.optional(docKind),
    opportunityId: v.optional(v.id('opportunities')),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    let documents: Doc<'documents'>[]
    if (args.kind) {
      documents = await ctx.db
        .query('documents')
        .withIndex('by_user_kind', (q) =>
          q.eq('userId', userId).eq('kind', args.kind!),
        )
        .collect()
    } else {
      documents = await ctx.db
        .query('documents')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
    }

    // Filtre optionnel par opportunite (en memoire : volume modeste par user).
    if (args.opportunityId) {
      documents = documents.filter(
        (doc) => doc.opportunityId === args.opportunityId,
      )
    }

    documents.sort((a, b) => b.createdAt - a.createdAt)

    return Promise.all(
      documents.map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.storageId)
        return { ...doc, url }
      }),
    )
  },
})

/**
 * Enregistre un document apres l'upload du blob. Si `opportunityId` est fourni,
 * verifie qu'elle appartient au user. Set `userId` + `createdAt`.
 */
export const create = mutation({
  args: {
    name: v.string(),
    kind: docKind,
    storageId: v.id('_storage'),
    opportunityId: v.optional(v.id('opportunities')),
    size: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<'documents'>> => {
    const { userId } = await requireUser(ctx)

    if (args.opportunityId) {
      const opportunity = await ctx.db.get(args.opportunityId)
      if (!opportunity || opportunity.userId !== userId) {
        throw new Error('Non autorise')
      }
    }

    // Objet construit dynamiquement : jamais `undefined` dans un insert.
    const doc: {
      userId: string
      name: string
      kind: DocKind
      storageId: Id<'_storage'>
      createdAt: number
      opportunityId?: Id<'opportunities'>
      size?: number
    } = {
      userId,
      name: args.name,
      kind: args.kind,
      storageId: args.storageId,
      createdAt: Date.now(),
    }
    if (args.opportunityId !== undefined) doc.opportunityId = args.opportunityId
    if (args.size !== undefined) doc.size = args.size

    return ctx.db.insert('documents', doc)
  },
})

/**
 * Met a jour les metadonnees d'un document (nom, type, rattachement). Ne touche
 * jamais au blob ni au `storageId`. Verifie la propriete (et celle de
 * l'opportunite cible si rattachement).
 */
export const update = mutation({
  args: {
    id: v.id('documents'),
    name: v.optional(v.string()),
    kind: v.optional(docKind),
    opportunityId: v.optional(v.id('opportunities')),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    await getOwnedDocument(ctx, userId, args.id)

    if (args.opportunityId) {
      const opportunity = await ctx.db.get(args.opportunityId)
      if (!opportunity || opportunity.userId !== userId) {
        throw new Error('Non autorise')
      }
    }

    const patch: {
      name?: string
      kind?: DocKind
      opportunityId?: Id<'opportunities'>
    } = {}
    if (args.name !== undefined) patch.name = args.name
    if (args.kind !== undefined) patch.kind = args.kind
    if (args.opportunityId !== undefined) patch.opportunityId = args.opportunityId

    await ctx.db.patch(args.id, patch)
    return null
  },
})

/**
 * Supprime un document : retire le blob du storage (`ctx.storage.delete`) puis
 * le document. Verifie la propriete.
 */
export const remove = mutation({
  args: { id: v.id('documents') },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    const doc = await getOwnedDocument(ctx, userId, args.id)

    await ctx.storage.delete(doc.storageId)
    await ctx.db.delete(args.id)
    return null
  },
})
