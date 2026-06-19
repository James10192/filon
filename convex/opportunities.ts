import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './lib/withUser'
import { currentPlan, requireUser } from './lib/withUser'
import {
  ACTIVE_STAGES,
  forbiddenError,
  limitsFor,
  notFoundError,
  planLimitError,
} from './lib/plan'
import { ensureTagsForUser } from './tags'

/**
 * Domaine opportunities · coeur du produit.
 *
 * Multi-tenant strict : chaque fonction commence par `requireUser` et scope via
 * un index `by_user*`. Aucune lecture/ecriture sans filtre `userId`.
 */

const stageValidator = v.union(
  v.literal('lead'),
  v.literal('contacted'),
  v.literal('applied'),
  v.literal('interview'),
  v.literal('negotiation'),
  v.literal('won'),
  v.literal('lost'),
)

const typeValidator = v.union(
  v.literal('job_offer'),
  v.literal('spontaneous'),
  v.literal('prospect'),
  v.literal('mission'),
)

const priorityValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
)

const importSourceValidator = v.union(
  v.literal('educarriere'),
  v.literal('linkedin'),
  v.literal('autre'),
  v.literal('manuel'),
)

const targetTypeValidator = v.union(
  v.literal('company'),
  v.literal('person'),
  v.literal('none'),
)

const sourceChannelValidator = v.union(
  v.literal('job_board'),
  v.literal('referral'),
  v.literal('event'),
  v.literal('networking'),
  v.literal('salon'),
  v.literal('social'),
  v.literal('inbound'),
  v.literal('cold'),
  v.literal('other'),
)

type Stage = Doc<'opportunities'>['stage']

const STAGES: Stage[] = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
]

const STAGE_LABELS: Record<Stage, string> = {
  lead: 'Piste',
  contacted: 'Contacté',
  applied: 'Candidature envoyée',
  interview: 'Entretien',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
}

/** Charge une opportunité et vérifie la propriété du user courant. */
async function ownedOpportunity(
  ctx: MutationCtx,
  userId: string,
  id: Id<'opportunities'>,
): Promise<Doc<'opportunities'>> {
  const doc = await ctx.db.get(id)
  if (!doc) throw notFoundError('Introuvable')
  if (doc.userId !== userId) throw forbiddenError('Non autorisé')
  return doc
}

/** Position suivante (max + 1) dans une colonne donnée du kanban. */
async function nextOrderInStage(
  ctx: MutationCtx,
  userId: string,
  stage: Stage,
): Promise<number> {
  const inStage = await ctx.db
    .query('opportunities')
    .withIndex('by_user_stage', (q) =>
      q.eq('userId', userId).eq('stage', stage),
    )
    .collect()
  return inStage.reduce((max, o) => Math.max(max, o.order), -1) + 1
}

/** Journalise un changement de stage dans la timeline (même transaction). */
async function logStatusChange(
  ctx: MutationCtx,
  userId: string,
  opportunityId: Id<'opportunities'>,
  from: Stage,
  to: Stage,
): Promise<void> {
  if (from === to) return
  await ctx.db.insert('activities', {
    userId,
    opportunityId,
    kind: 'status_change',
    content: `Étape changée : ${STAGE_LABELS[from]} → ${STAGE_LABELS[to]}`,
    createdAt: Date.now(),
  })
}

/**
 * Type des opportunites enrichies renvoyees par les queries : la ligne brute,
 * plus le nom de la cible resolu (companyName / contactName) et le `targetType`
 * effectif (derive de companyId/contactId si non explicitement stocke).
 */
type EnrichedOpportunity = Doc<'opportunities'> & {
  companyName?: string
  contactName?: string
  effectiveTargetType: 'company' | 'person' | 'none'
}

/**
 * Enrichit une liste d'opportunites (deja scopees au user) avec le nom de la
 * cible. Resout entreprises et contacts par lots avec un cache local (pas de
 * lecture redondante). `effectiveTargetType` derive du `targetType` stocke, ou a
 * defaut de la presence d'un companyId/contactId.
 */
async function enrichTargets(
  ctx: QueryCtx,
  userId: string,
  rows: Doc<'opportunities'>[],
): Promise<EnrichedOpportunity[]> {
  const companyNames = new Map<Id<'companies'>, string | undefined>()
  const contactNames = new Map<Id<'contacts'>, string | undefined>()

  return Promise.all(
    rows.map(async (row) => {
      let companyName: string | undefined
      let contactName: string | undefined

      if (row.companyId) {
        if (companyNames.has(row.companyId)) {
          companyName = companyNames.get(row.companyId)
        } else {
          const company = await ctx.db.get(row.companyId)
          companyName =
            company && company.userId === userId ? company.name : undefined
          companyNames.set(row.companyId, companyName)
        }
      }
      if (row.contactId) {
        if (contactNames.has(row.contactId)) {
          contactName = contactNames.get(row.contactId)
        } else {
          const contact = await ctx.db.get(row.contactId)
          contactName =
            contact && contact.userId === userId ? contact.name : undefined
          contactNames.set(row.contactId, contactName)
        }
      }

      const effectiveTargetType: 'company' | 'person' | 'none' =
        row.targetType ??
        (row.companyId ? 'company' : row.contactId ? 'person' : 'none')

      const enriched: EnrichedOpportunity = { ...row, effectiveTargetType }
      if (companyName) enriched.companyName = companyName
      if (contactName) enriched.contactName = contactName
      return enriched
    }),
  )
}

export const list = query({
  args: {
    stage: v.optional(stageValidator),
    type: v.optional(typeValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)

    let rows: Doc<'opportunities'>[]
    if (args.stage) {
      rows = await ctx.db
        .query('opportunities')
        .withIndex('by_user_stage', (q) =>
          q.eq('userId', userId).eq('stage', args.stage!),
        )
        .collect()
    } else if (args.type) {
      rows = await ctx.db
        .query('opportunities')
        .withIndex('by_user_type', (q) =>
          q.eq('userId', userId).eq('type', args.type!),
        )
        .collect()
    } else {
      rows = await ctx.db
        .query('opportunities')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
    }

    // Filtres secondaires en mémoire (déjà scopés au user).
    if (args.type && args.stage) {
      rows = rows.filter((o) => o.type === args.type)
    }
    const enriched = await enrichTargets(ctx, userId, rows)

    const search = args.search?.trim().toLowerCase()
    const filtered = search
      ? enriched.filter(
          (o) =>
            o.title.toLowerCase().includes(search) ||
            (o.compensation?.toLowerCase().includes(search) ?? false) ||
            (o.location?.toLowerCase().includes(search) ?? false) ||
            (o.companyName?.toLowerCase().includes(search) ?? false) ||
            (o.contactName?.toLowerCase().includes(search) ?? false) ||
            o.tags.some((t) => t.toLowerCase().includes(search)),
        )
      : enriched

    return filtered.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const board = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    const rows = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const enriched = await enrichTargets(ctx, userId, rows)

    const grouped = {} as Record<Stage, EnrichedOpportunity[]>
    for (const stage of STAGES) grouped[stage] = []
    for (const row of enriched) grouped[row.stage].push(row)
    for (const stage of STAGES) {
      grouped[stage].sort((a, b) => a.order - b.order)
    }
    return grouped
  },
})

/**
 * `api.opportunities.calendar` — flux de la vue Calendrier.
 *
 * Renvoie, scopé au user, les opportunités portant une échéance (`deadline`)
 * ou une prochaine action (`nextActionAt`), plus les relances dues (followups
 * non terminés). Additif et en lecture seule : aucune écriture, aucun nouvel
 * index requis (on lit `by_user` + `by_user_done`).
 */
export const calendar = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)

    const opportunities = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const deadlineItems = opportunities
      .filter((o) => o.deadline)
      .map((o) => ({
        id: o._id,
        date: o.deadline!,
        title: o.title,
        type: o.type,
        stage: o.stage,
      }))

    const nextActionItems = opportunities
      .filter((o) => o.nextActionAt)
      .map((o) => ({
        id: o._id,
        date: o.nextActionAt!,
        title: o.title,
        type: o.type,
        stage: o.stage,
      }))

    const openFollowups = await ctx.db
      .query('followups')
      .withIndex('by_user_done', (q) =>
        q.eq('userId', userId).eq('done', false),
      )
      .collect()

    const oppById = new Map(opportunities.map((o) => [o._id, o]))
    const followupItems = openFollowups.map((f) => {
      const opp = f.opportunityId ? oppById.get(f.opportunityId) : undefined
      return {
        id: f._id,
        opportunityId: f.opportunityId ?? null,
        date: f.dueDate,
        label: f.label,
        opportunityTitle: opp?.title ?? null,
      }
    })

    return {
      deadlines: deadlineItems,
      nextActions: nextActionItems,
      followups: followupItems,
    }
  },
})

export const get = query({
  args: { id: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const doc = await ctx.db.get(args.id)
    if (!doc) throw notFoundError('Introuvable')
    if (doc.userId !== userId) throw forbiddenError('Non autorisé')

    const company = doc.companyId ? await ctx.db.get(doc.companyId) : null
    const contact = doc.contactId ? await ctx.db.get(doc.contactId) : null
    const ownedCompany =
      company && company.userId === userId ? company : undefined
    const ownedContact =
      contact && contact.userId === userId ? contact : undefined

    const effectiveTargetType: 'company' | 'person' | 'none' =
      doc.targetType ??
      (doc.companyId ? 'company' : doc.contactId ? 'person' : 'none')

    return {
      ...doc,
      company: ownedCompany,
      contact: ownedContact,
      companyName: ownedCompany?.name,
      contactName: ownedContact?.name,
      effectiveTargetType,
    }
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    type: typeValidator,
    companyId: v.optional(v.id('companies')),
    contactId: v.optional(v.id('contacts')),
    targetType: v.optional(targetTypeValidator),
    source: v.optional(v.string()),
    sourceChannel: v.optional(sourceChannelValidator),
    sourceDetail: v.optional(v.string()),
    url: v.optional(v.string()),
    location: v.optional(v.string()),
    compensation: v.optional(v.string()),
    stage: v.optional(stageValidator),
    priority: v.optional(priorityValidator),
    deadline: v.optional(v.string()),
    appliedAt: v.optional(v.string()),
    nextActionAt: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    importSource: v.optional(importSourceValidator),
    sourceUrl: v.optional(v.string()),
    importedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const stage: Stage = args.stage ?? 'lead'

    // Verifie la propriete des cibles fournies (anti-fuite cross-tenant).
    if (args.companyId) {
      const company = await ctx.db.get(args.companyId)
      if (!company || company.userId !== userId) {
        throw forbiddenError('Non autorisé')
      }
    }
    if (args.contactId) {
      const contact = await ctx.db.get(args.contactId)
      if (!contact || contact.userId !== userId) {
        throw forbiddenError('Non autorisé')
      }
    }

    // Gating freemium : plafond d'opportunités actives sur le palier gratuit.
    // On ne compte que les stages actifs (les gagnées/perdues ne pèsent pas) et
    // on n'applique le cap que si la nouvelle opportunité est elle-même active.
    const limit = limitsFor(await currentPlan(ctx, userId)).activeOpportunities
    if (
      limit !== null &&
      (ACTIVE_STAGES as readonly string[]).includes(stage)
    ) {
      const all = await ctx.db
        .query('opportunities')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
      const activeCount = all.filter((o) =>
        (ACTIVE_STAGES as readonly string[]).includes(o.stage),
      ).length
      if (activeCount >= limit) {
        throw planLimitError(
          `Vous avez atteint la limite de ${limit} opportunités actives du palier Découverte. Passez à Pro pour un pipeline illimité.`,
        )
      }
    }

    const now = Date.now()
    const order = await nextOrderInStage(ctx, userId, stage)

    // Etiquettes : on garantit leur presence au catalogue (idempotent) et on
    // stocke les noms normalises dans l'array `tags` de l'opportunite.
    const tags =
      args.tags && args.tags.length > 0
        ? await ensureTagsForUser(ctx, userId, args.tags)
        : []

    // Construction dynamique : jamais `undefined` dans l'insert.
    const doc: Record<string, unknown> = {
      userId,
      title: args.title,
      type: args.type,
      stage,
      priority: args.priority ?? 'medium',
      tags,
      order,
      createdAt: now,
      updatedAt: now,
    }
    if (args.companyId !== undefined) doc.companyId = args.companyId
    if (args.contactId !== undefined) doc.contactId = args.contactId
    if (args.targetType !== undefined) doc.targetType = args.targetType
    if (args.source !== undefined) doc.source = args.source
    if (args.sourceChannel !== undefined) doc.sourceChannel = args.sourceChannel
    if (args.sourceDetail !== undefined) doc.sourceDetail = args.sourceDetail
    if (args.url !== undefined) doc.url = args.url
    if (args.location !== undefined) doc.location = args.location
    if (args.compensation !== undefined) doc.compensation = args.compensation
    if (args.deadline !== undefined) doc.deadline = args.deadline
    if (args.appliedAt !== undefined) doc.appliedAt = args.appliedAt
    if (args.nextActionAt !== undefined) doc.nextActionAt = args.nextActionAt
    if (args.description !== undefined) doc.description = args.description
    if (args.importSource !== undefined) doc.importSource = args.importSource
    if (args.sourceUrl !== undefined) doc.sourceUrl = args.sourceUrl
    if (args.importedAt !== undefined) doc.importedAt = args.importedAt

    const opportunityId = await ctx.db.insert(
      'opportunities',
      doc as unknown as Omit<
        Doc<'opportunities'>,
        '_id' | '_creationTime'
      >,
    )

    // Journalise la création dans la timeline (même transaction).
    await ctx.db.insert('activities', {
      userId,
      opportunityId,
      kind: 'other',
      content: `Opportunité créée : ${args.title}`,
      createdAt: now,
    })

    return opportunityId
  },
})

export const update = mutation({
  args: {
    id: v.id('opportunities'),
    title: v.optional(v.string()),
    type: v.optional(typeValidator),
    companyId: v.optional(v.id('companies')),
    contactId: v.optional(v.id('contacts')),
    targetType: v.optional(targetTypeValidator),
    source: v.optional(v.string()),
    sourceChannel: v.optional(sourceChannelValidator),
    sourceDetail: v.optional(v.string()),
    url: v.optional(v.string()),
    location: v.optional(v.string()),
    compensation: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    deadline: v.optional(v.string()),
    appliedAt: v.optional(v.string()),
    nextActionAt: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await ownedOpportunity(ctx, userId, args.id)

    // Verifie la propriete des cibles fournies (anti-fuite cross-tenant).
    if (args.companyId !== undefined) {
      const company = await ctx.db.get(args.companyId)
      if (!company || company.userId !== userId) {
        throw forbiddenError('Non autorisé')
      }
    }
    if (args.contactId !== undefined) {
      const contact = await ctx.db.get(args.contactId)
      if (!contact || contact.userId !== userId) {
        throw forbiddenError('Non autorisé')
      }
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() }
    const { id, tags, ...fields } = args
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value
    }
    // Etiquettes : cataloguer (idempotent) avant de stocker les noms normalises.
    if (tags !== undefined) {
      patch.tags = await ensureTagsForUser(ctx, userId, tags)
    }
    await ctx.db.patch(
      id,
      patch as Partial<Doc<'opportunities'>>,
    )
    return null
  },
})

export const move = mutation({
  args: {
    id: v.id('opportunities'),
    stage: stageValidator,
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const doc = await ownedOpportunity(ctx, userId, args.id)
    const previousStage = doc.stage

    await ctx.db.patch(args.id, {
      stage: args.stage,
      order: args.order,
      updatedAt: Date.now(),
    })
    await logStatusChange(ctx, userId, args.id, previousStage, args.stage)
    return null
  },
})

export const reorder = mutation({
  args: {
    stage: stageValidator,
    orderedIds: v.array(v.id('opportunities')),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const now = Date.now()
    let order = 0
    for (const id of args.orderedIds) {
      const doc = await ctx.db.get(id)
      if (!doc || doc.userId !== userId) continue
      await ctx.db.patch(id, { stage: args.stage, order, updatedAt: now })
      order += 1
    }
    return null
  },
})

export const setStage = mutation({
  args: { id: v.id('opportunities'), stage: stageValidator },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const doc = await ownedOpportunity(ctx, userId, args.id)
    const previousStage = doc.stage
    const order = await nextOrderInStage(ctx, userId, args.stage)

    await ctx.db.patch(args.id, {
      stage: args.stage,
      order,
      updatedAt: Date.now(),
    })
    await logStatusChange(ctx, userId, args.id, previousStage, args.stage)
    return null
  },
})

/** Change uniquement la priorité (édition inline rapide depuis la liste/détail). */
export const setPriority = mutation({
  args: { id: v.id('opportunities'), priority: priorityValidator },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await ownedOpportunity(ctx, userId, args.id)
    await ctx.db.patch(args.id, {
      priority: args.priority,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const remove = mutation({
  args: { id: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await ownedOpportunity(ctx, userId, args.id)

    // Cascade : supprime les activités liées.
    const activities = await ctx.db
      .query('activities')
      .withIndex('by_opportunity', (q) => q.eq('opportunityId', args.id))
      .collect()
    for (const activity of activities) {
      if (activity.userId === userId) await ctx.db.delete(activity._id)
    }

    // Détache les relances liées.
    const followups = await ctx.db
      .query('followups')
      .withIndex('by_opportunity', (q) => q.eq('opportunityId', args.id))
      .collect()
    for (const followup of followups) {
      if (followup.userId === userId) {
        await ctx.db.patch(followup._id, { opportunityId: undefined })
      }
    }

    // Détache les documents liés.
    const documents = await ctx.db
      .query('documents')
      .withIndex('by_opportunity', (q) => q.eq('opportunityId', args.id))
      .collect()
    for (const document of documents) {
      if (document.userId === userId) {
        await ctx.db.patch(document._id, { opportunityId: undefined })
      }
    }

    await ctx.db.delete(args.id)
    return null
  },
})
