import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'

/**
 * Écritures internes du copilote (scopées `userId`), appelées par les outils
 * d'écriture (`agent/tools/*` par domaine). `internalMutation` = non exposé au
 * client : seule l'action du copilote les déclenche, après contrôle d'accès et
 * de permission. La logique reprend celle des domaines existants (opportunités,
 * relances, activités) en forçant `userId` côté serveur.
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

const activityKindValidator = v.union(
  v.literal('note'),
  v.literal('email'),
  v.literal('call'),
  v.literal('interview'),
  v.literal('status_change'),
  v.literal('other'),
)

type Stage = Doc<'opportunities'>['stage']

const STAGE_LABELS: Record<Stage, string> = {
  lead: 'Piste',
  contacted: 'Contacté',
  applied: 'Candidature envoyée',
  interview: 'Entretien',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
}

/** Position suivante (max + 1) dans une colonne du kanban. */
async function nextOrderInStage(
  ctx: { db: any },
  userId: string,
  stage: Stage,
): Promise<number> {
  const inStage = (await ctx.db
    .query('opportunities')
    .withIndex('by_user_stage', (q: any) =>
      q.eq('userId', userId).eq('stage', stage),
    )
    .collect()) as Doc<'opportunities'>[]
  return inStage.reduce((max, o) => Math.max(max, o.order), -1) + 1
}

/** Résout (ou crée) une entreprise du user par nom. */
async function resolveCompanyId(
  ctx: { db: any },
  userId: string,
  companyName: string | undefined,
): Promise<Id<'companies'> | undefined> {
  const name = companyName?.trim()
  if (!name) return undefined
  const existing = (await ctx.db
    .query('companies')
    .withIndex('by_user_name', (q: any) =>
      q.eq('userId', userId).eq('name', name),
    )
    .unique()) as Doc<'companies'> | null
  if (existing) return existing._id
  return (await ctx.db.insert('companies', {
    userId,
    name,
    createdAt: Date.now(),
  })) as Id<'companies'>
}

export const createOpportunity = internalMutation({
  args: {
    userId: v.string(),
    title: v.string(),
    type: typeValidator,
    stage: v.optional(stageValidator),
    priority: v.optional(priorityValidator),
    companyName: v.optional(v.string()),
    url: v.optional(v.string()),
    deadline: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ id: Id<'opportunities'> }> => {
    const stage: Stage = args.stage ?? 'lead'
    const now = Date.now()
    const order = await nextOrderInStage(ctx, args.userId, stage)
    const companyId = await resolveCompanyId(ctx, args.userId, args.companyName)

    const doc: Record<string, unknown> = {
      userId: args.userId,
      title: args.title,
      type: args.type,
      stage,
      priority: args.priority ?? 'medium',
      tags: args.tags ?? [],
      order,
      createdAt: now,
      updatedAt: now,
    }
    if (companyId !== undefined) doc.companyId = companyId
    if (args.url !== undefined) doc.url = args.url
    if (args.deadline !== undefined) doc.deadline = args.deadline

    const id = (await ctx.db.insert(
      'opportunities',
      doc as Omit<Doc<'opportunities'>, '_id' | '_creationTime'>,
    )) as Id<'opportunities'>

    await ctx.db.insert('activities', {
      userId: args.userId,
      opportunityId: id,
      kind: 'other',
      content: `Opportunité créée par le copilote : ${args.title}`,
      createdAt: now,
    })
    return { id }
  },
})

export const scheduleFollowup = internalMutation({
  args: {
    userId: v.string(),
    label: v.string(),
    dueDate: v.string(),
    opportunityId: v.optional(v.id('opportunities')),
    proposalId: v.optional(v.id('proposals')),
  },
  handler: async (ctx, args): Promise<{ id: Id<'followups'> }> => {
    const label = args.label.trim()
    if (!label) throw new Error('L’intitulé est requis')
    if (!args.dueDate) throw new Error('La date est requise')

    if (args.opportunityId) {
      const opp = await ctx.db.get(args.opportunityId)
      if (!opp || opp.userId !== args.userId) throw new Error('Non autorisé')
    }
    if (args.proposalId) {
      const p = await ctx.db.get(args.proposalId)
      if (!p || p.userId !== args.userId) throw new Error('Non autorisé')
    }

    const doc: Record<string, unknown> = {
      userId: args.userId,
      label,
      dueDate: args.dueDate,
      done: false,
      createdAt: Date.now(),
    }
    if (args.opportunityId) doc.opportunityId = args.opportunityId
    if (args.proposalId) doc.proposalId = args.proposalId

    const id = (await ctx.db.insert(
      'followups',
      doc as Omit<Doc<'followups'>, '_id' | '_creationTime'>,
    )) as Id<'followups'>
    return { id }
  },
})

export const updateOpportunityStage = internalMutation({
  args: {
    userId: v.string(),
    opportunityId: v.id('opportunities'),
    stage: stageValidator,
  },
  handler: async (ctx, args): Promise<{ from: Stage; to: Stage }> => {
    const doc = await ctx.db.get(args.opportunityId)
    if (!doc) throw new Error('Introuvable')
    if (doc.userId !== args.userId) throw new Error('Non autorisé')
    const from = doc.stage
    const order = await nextOrderInStage(ctx, args.userId, args.stage)
    await ctx.db.patch(args.opportunityId, {
      stage: args.stage,
      order,
      updatedAt: Date.now(),
    })
    if (from !== args.stage) {
      await ctx.db.insert('activities', {
        userId: args.userId,
        opportunityId: args.opportunityId,
        kind: 'status_change',
        content: `Étape changée : ${STAGE_LABELS[from]} → ${STAGE_LABELS[args.stage]}`,
        createdAt: Date.now(),
      })
    }
    return { from, to: args.stage }
  },
})

export const draftApplication = internalMutation({
  args: {
    userId: v.string(),
    opportunityId: v.id('opportunities'),
    kind: v.union(v.literal('email'), v.literal('lettre'), v.literal('pitch')),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ id: Id<'activities'> }> => {
    const opp = await ctx.db.get(args.opportunityId)
    if (!opp) throw new Error('Introuvable')
    if (opp.userId !== args.userId) throw new Error('Non autorisé')
    const label =
      args.kind === 'email'
        ? 'E-mail'
        : args.kind === 'lettre'
          ? 'Lettre'
          : 'Pitch'
    const id = (await ctx.db.insert('activities', {
      userId: args.userId,
      opportunityId: args.opportunityId,
      kind: args.kind === 'email' ? 'email' : 'note',
      content: `Brouillon ${label} (copilote) :\n${args.content}`,
      createdAt: Date.now(),
    })) as Id<'activities'>
    return { id }
  },
})

export const addActivity = internalMutation({
  args: {
    userId: v.string(),
    opportunityId: v.id('opportunities'),
    kind: activityKindValidator,
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ id: Id<'activities'> }> => {
    const opp = await ctx.db.get(args.opportunityId)
    if (!opp) throw new Error('Introuvable')
    if (opp.userId !== args.userId) throw new Error('Non autorisé')
    const id = (await ctx.db.insert('activities', {
      userId: args.userId,
      opportunityId: args.opportunityId,
      kind: args.kind,
      content: args.content,
      createdAt: Date.now(),
    })) as Id<'activities'>
    return { id }
  },
})
