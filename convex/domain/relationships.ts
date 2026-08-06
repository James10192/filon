import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'
import { requireUser } from '../lib/withUser'
import {
  requireOwnedCompany,
  requireOwnedContact,
  requireOwnedRelationship,
} from './ownership'

const kindValidator = v.union(
  v.literal('prospect'), v.literal('client'), v.literal('partner'),
  v.literal('referrer'), v.literal('other'),
)

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    return ctx.db.query('relationships').withIndex('by_user', (q) => q.eq('userId', userId)).collect()
  },
})

export const createRelationship = mutation({
  args: { label: v.string(), kind: kindValidator, contactId: v.optional(v.id('contacts')), companyId: v.optional(v.id('companies')) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    if (!args.contactId && !args.companyId) throw new Error('Une relation doit cibler un contact ou une entreprise.')
    await Promise.all([
      args.contactId ? requireOwnedContact(ctx, userId, args.contactId) : null,
      args.companyId ? requireOwnedCompany(ctx, userId, args.companyId) : null,
    ])
    const now = Date.now()
    return ctx.db.insert('relationships', { userId, label: args.label, kind: args.kind, visibility: 'private', ...(args.contactId ? { contactId: args.contactId } : {}), ...(args.companyId ? { companyId: args.companyId } : {}), createdAt: now, updatedAt: now })
  },
})

export const addNote = mutation({
  args: { relationshipId: v.id('relationships'), body: v.string(), shared: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await requireOwnedRelationship(ctx, userId, args.relationshipId)
    const now = Date.now()
    return ctx.db.insert('relationshipNotes', { userId, relationshipId: args.relationshipId, body: args.body, visibility: args.shared ? 'shared' : 'private', createdAt: now, updatedAt: now })
  },
})

export const shareRelationshipExplicitly = mutation({
  args: { relationshipId: v.id('relationships'), sharedWithUserId: v.string(), permission: v.optional(v.union(v.literal('read'), v.literal('write'))) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    await requireOwnedRelationship(ctx, userId, args.relationshipId)
    if (args.sharedWithUserId === userId) throw new Error('Le proprietaire dispose deja de cet acces.')
    const existing = await ctx.db.query('relationshipShares').withIndex('by_owner_recipient', (q) => q.eq('ownerUserId', userId).eq('sharedWithUserId', args.sharedWithUserId)).collect()
    const share = existing.find((row) => row.relationshipId === args.relationshipId)
    const permission = args.permission ?? 'read'
    if (share) await ctx.db.patch(share._id, { permission })
    else await ctx.db.insert('relationshipShares', { relationshipId: args.relationshipId, ownerUserId: userId, sharedWithUserId: args.sharedWithUserId, permission, createdAt: Date.now() })
    await ctx.db.patch(args.relationshipId, { visibility: 'shared', updatedAt: Date.now() })
    return null
  },
})
