import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser } from './lib/withUser'
import { notFoundError, validationError } from './lib/plan'
import {
  ensureRecoveryCase,
  evidenceKindValidator,
  existingRecoveryCase,
  recoveryCaseStatusValidator,
  serializeRecoveryCase,
} from './lib/recoveryCaseHelpers'

export const listDashboard = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    const rows = await ctx.db
      .query('recoveryCases')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const serialized = []
    for (const row of rows) serialized.push(await serializeRecoveryCase(ctx, row))
    return serialized.sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

export const getForOpportunity = query({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const item = await existingRecoveryCase(ctx, userId, args.opportunityId)
    if (!item) return null
    return await serializeRecoveryCase(ctx, item)
  },
})

export const createOrGet = mutation({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const opportunity = await ctx.db.get(args.opportunityId)
    if (!opportunity || opportunity.userId !== userId) {
      throw notFoundError('Introuvable')
    }
    if (opportunity.stage !== 'won') {
      throw validationError('Le recouvrement concerne une opportunité gagnée')
    }
    return await ensureRecoveryCase(ctx, userId, opportunity)
  },
})

export const confirmPayment = mutation({
  args: {
    recoveryCaseId: v.id('recoveryCases'),
    amountPaid: v.optional(v.number()),
    paidAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const item = await ctx.db.get(args.recoveryCaseId)
    if (!item || item.userId !== userId) throw notFoundError('Introuvable')
    const proofs = await ctx.db
      .query('recoveryEvidence')
      .withIndex('by_case', (q) => q.eq('recoveryCaseId', item._id))
      .collect()
    const amountPaid = args.amountPaid ?? item.amountExpected ?? item.amountPaid
    const expected = item.amountExpected ?? amountPaid ?? 0
    const fullyPaid = (amountPaid ?? 0) >= expected
    const status =
      proofs.length === 0
        ? ('proof_missing' as const)
        : fullyPaid
          ? ('paid_confirmed' as const)
          : ('partial_paid' as const)
    await ctx.db.patch(item._id, {
      status,
      ...(amountPaid !== undefined ? { amountPaid } : {}),
      ...(args.paidAt
        ? { paidAt: args.paidAt }
        : { paidAt: new Date().toISOString().slice(0, 10) }),
      updatedAt: Date.now(),
    })
    if (fullyPaid) {
      await ctx.db.patch(item.opportunityId, {
        recoveryStatus: 'paid',
        updatedAt: Date.now(),
      })
    }
    return status
  },
})

export const setStatus = mutation({
  args: {
    recoveryCaseId: v.id('recoveryCases'),
    status: recoveryCaseStatusValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const item = await ctx.db.get(args.recoveryCaseId)
    if (!item || item.userId !== userId) throw notFoundError('Introuvable')
    await ctx.db.patch(item._id, {
      status: args.status,
      updatedAt: Date.now(),
    })
    if (args.status === 'dispute' || args.status === 'cancelled') {
      await ctx.db.patch(item.opportunityId, {
        recoveryStatus:
          args.status === 'cancelled' ? 'cancelled' : 'manual_followup',
        updatedAt: Date.now(),
      })
    }
    return null
  },
})

export const attachEvidence = mutation({
  args: {
    recoveryCaseId: v.id('recoveryCases'),
    kind: evidenceKindValidator,
    documentId: v.optional(v.id('documents')),
    reference: v.optional(v.string()),
    amount: v.optional(v.number()),
    issuedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const item = await ctx.db.get(args.recoveryCaseId)
    if (!item || item.userId !== userId) throw notFoundError('Introuvable')
    if (args.documentId) {
      const document = await ctx.db.get(args.documentId)
      if (!document || document.userId !== userId) {
        throw notFoundError('Document introuvable')
      }
    }
    const id = await ctx.db.insert('recoveryEvidence', {
      userId,
      recoveryCaseId: args.recoveryCaseId,
      kind: args.kind,
      createdAt: Date.now(),
      ...(args.documentId ? { documentId: args.documentId } : {}),
      ...(args.reference ? { reference: args.reference.trim() } : {}),
      ...(args.amount !== undefined ? { amount: args.amount } : {}),
      ...(args.issuedAt ? { issuedAt: args.issuedAt } : {}),
      ...(args.notes ? { notes: args.notes.trim() } : {}),
    })
    const patch: Partial<Doc<'recoveryCases'>> = {
      updatedAt: Date.now(),
    }
    if (
      args.kind === 'facture_fne' ||
      args.kind === 'facture_hors_fne_filon' ||
      args.kind === 'proforma_hors_fne'
    ) {
      patch.status = item.status === 'to_invoice' ? 'invoice_ready' : item.status
      if (args.reference) patch.fneReference = args.reference.trim()
    }
    if (item.status === 'proof_missing') patch.status = 'paid_confirmed'
    if (args.documentId) patch.proofDocumentId = args.documentId
    await ctx.db.patch(item._id, patch)
    return id
  },
})
