import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'
import { requireUser } from '../lib/withUser'
import {
  requireOwnedNeed,
  requireOwnedOpportunity,
  requireOwnedRelationship,
} from './ownership'

const priorityValidator = v.union(v.literal('low'), v.literal('medium'), v.literal('high'))
const statusValidator = v.union(v.literal('open'), v.literal('validated'), v.literal('closed'))

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    const [needs, versions] = await Promise.all([
      ctx.db.query('needs').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('needVersions').withIndex('by_user_created', (q) => q.eq('userId', userId)).collect(),
    ])
    const latestByNeed = new Map<
      (typeof versions)[number]['needId'],
      (typeof versions)[number]
    >()
    for (const version of versions) {
      const current = latestByNeed.get(version.needId)
      if (!current || version.version > current.version) {
        latestByNeed.set(version.needId, version)
      }
    }
    return needs
      .map((need) => ({ ...need, latest: latestByNeed.get(need._id) ?? null }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

export const upsertNeedWithVersion = mutation({
  args: { needId: v.optional(v.id('needs')), relationshipId: v.optional(v.id('relationships')), title: v.string(), statement: v.string(), priority: priorityValidator, context: v.optional(v.string()), status: v.optional(statusValidator), shared: v.optional(v.boolean()), proofs: v.optional(v.array(v.object({ kind: v.union(v.literal('note'), v.literal('url'), v.literal('file'), v.literal('interaction')), value: v.string() }))), links: v.optional(v.array(v.object({ label: v.string(), url: v.optional(v.string()), relationshipId: v.optional(v.id('relationships')), opportunityId: v.optional(v.id('opportunities')) }))) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const now = Date.now()
    let needId = args.needId
    let version = 1
    if (needId) {
      const need = await requireOwnedNeed(ctx, userId, needId)
      version = need.latestVersion + 1
      await ctx.db.patch(needId, { title: args.title, status: args.status ?? need.status, visibility: args.shared ? 'shared' : need.visibility, latestVersion: version, updatedAt: now })
    } else {
      if (args.relationshipId) {
        await requireOwnedRelationship(ctx, userId, args.relationshipId)
      }
      needId = await ctx.db.insert('needs', { userId, title: args.title, status: args.status ?? 'open', visibility: args.shared ? 'shared' : 'private', latestVersion: version, ...(args.relationshipId ? { relationshipId: args.relationshipId } : {}), createdAt: now, updatedAt: now })
    }
    await Promise.all(
      (args.links ?? []).flatMap((link) => [
        link.relationshipId
          ? requireOwnedRelationship(ctx, userId, link.relationshipId)
          : null,
        link.opportunityId
          ? requireOwnedOpportunity(ctx, userId, link.opportunityId)
          : null,
      ]),
    )
    const versionId = await ctx.db.insert('needVersions', { userId, needId, version, statement: args.statement, priority: args.priority, ...(args.context ? { context: args.context } : {}), createdAt: now })
    for (const proof of args.proofs ?? []) await ctx.db.insert('needProofs', { userId, needId, needVersionId: versionId, kind: proof.kind, value: proof.value, createdAt: now })
    for (const link of args.links ?? []) await ctx.db.insert('needLinks', { userId, needId, label: link.label, ...(link.url ? { url: link.url } : {}), ...(link.relationshipId ? { relationshipId: link.relationshipId } : {}), ...(link.opportunityId ? { opportunityId: link.opportunityId } : {}), createdAt: now })
    return { needId, versionId, version }
  },
})
