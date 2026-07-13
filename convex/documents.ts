import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { validationError } from './lib/plan'
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
  v.literal('devis'),
  v.literal('proforma'),
  v.literal('autre'),
)

type DocKind = 'cv' | 'lettre' | 'portfolio' | 'contrat' | 'devis' | 'proforma' | 'autre'

/** Entites auxquelles un document peut etre rattache (Documents 360). */
const entityType = v.union(
  v.literal('opportunity'),
  v.literal('proposal'),
  v.literal('contact'),
  v.literal('company'),
)

type EntityType = 'opportunity' | 'proposal' | 'contact' | 'company'

// Table Convex correspondant a chaque `entityType` (pour la verif de propriete).
const ENTITY_TABLE: Record<
  EntityType,
  'opportunities' | 'proposals' | 'contacts' | 'companies'
> = {
  opportunity: 'opportunities',
  proposal: 'proposals',
  contact: 'contacts',
  company: 'companies',
}

/**
 * Verifie que l'entite cible existe et appartient au user courant. Resout l'id
 * polymorphe (`string`) vers le bon document selon `entityType`. Throw si
 * introuvable ou non possedee.
 */
async function assertOwnedEntity(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  type: EntityType,
  entityId: string,
): Promise<void> {
  const table = ENTITY_TABLE[type]
  const entity = await ctx.db.get(entityId as Id<typeof table>)
  if (!entity || (entity as { userId?: string }).userId !== userId) {
    throw new Error('Non autorise')
  }
}

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

    const archivedRevision = await ctx.db
      .query('billingDocumentRevisions')
      .withIndex('by_document_id', (q) => q.eq('documentId', args.id))
      .first()
    if (archivedRevision) {
      throw validationError(
        "Ce document est une révision commerciale archivée et ne peut pas être supprimé.",
      )
    }

    await ctx.storage.delete(doc.storageId)
    await ctx.db.delete(args.id)
    return null
  },
})

// --- Documents 360 : liaisons document <-> entite (additif) ---

/**
 * Rattache un document a une entite (opportunite, proposition, contact,
 * entreprise). Verifie que le document ET l'entite appartiennent au user.
 * Idempotent : un lien deja present n'est pas duplique (on renvoie l'existant).
 */
export const attachToEntity = mutation({
  args: {
    documentId: v.id('documents'),
    entityType,
    entityId: v.string(),
  },
  handler: async (ctx, args): Promise<Id<'documentLinks'>> => {
    const { userId } = await requireUser(ctx)
    await getOwnedDocument(ctx, userId, args.documentId)
    await assertOwnedEntity(ctx, userId, args.entityType, args.entityId)

    // Idempotence : un seul lien par (document, entite). On filtre les liens du
    // document (volume modeste) sur le couple (entityType, entityId).
    const existingLinks = await ctx.db
      .query('documentLinks')
      .withIndex('by_document', (q) => q.eq('documentId', args.documentId))
      .collect()
    const already = existingLinks.find(
      (l) => l.entityType === args.entityType && l.entityId === args.entityId,
    )
    if (already) return already._id

    return ctx.db.insert('documentLinks', {
      userId,
      documentId: args.documentId,
      entityType: args.entityType,
      entityId: args.entityId,
      createdAt: Date.now(),
    })
  },
})

/**
 * Detache un document d'une entite : supprime le lien (document, entite).
 * Verifie la propriete du document. No-op si le lien n'existe pas.
 */
export const detachFromEntity = mutation({
  args: {
    documentId: v.id('documents'),
    entityType,
    entityId: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const { userId } = await requireUser(ctx)
    await getOwnedDocument(ctx, userId, args.documentId)

    const links = await ctx.db
      .query('documentLinks')
      .withIndex('by_document', (q) => q.eq('documentId', args.documentId))
      .collect()
    for (const link of links) {
      if (
        link.userId === userId &&
        link.entityType === args.entityType &&
        link.entityId === args.entityId
      ) {
        await ctx.db.delete(link._id)
      }
    }
    return null
  },
})

/**
 * Liste des documents rattaches a une entite (enrichis de leur `url` resolue),
 * tries par `createdAt desc`. Verifie que l'entite appartient au user. Lit les
 * liens via l'index `by_entity` (scopes ensuite au user par securite).
 */
export const listForEntity = query({
  args: { entityType, entityId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await assertOwnedEntity(ctx, userId, args.entityType, args.entityId)

    const links = await ctx.db
      .query('documentLinks')
      .withIndex('by_entity', (q) =>
        q.eq('entityType', args.entityType).eq('entityId', args.entityId),
      )
      .collect()

    const docs = await Promise.all(
      links
        .filter((l) => l.userId === userId)
        .map((l) => ctx.db.get(l.documentId)),
    )

    const owned = docs.filter(
      (d): d is Doc<'documents'> => d !== null && d.userId === userId,
    )
    owned.sort((a, b) => b.createdAt - a.createdAt)

    return Promise.all(
      owned.map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.storageId)
        return { ...doc, url }
      }),
    )
  },
})
