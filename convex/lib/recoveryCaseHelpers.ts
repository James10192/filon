import { v } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from './withUser'

export const recoveryCaseStatusValidator = v.union(
  v.literal('to_invoice'),
  v.literal('invoice_ready'),
  v.literal('invoice_sent'),
  v.literal('waiting_payment'),
  v.literal('mailpulse_active'),
  v.literal('payment_promised'),
  v.literal('partial_paid'),
  v.literal('paid_to_confirm'),
  v.literal('paid_confirmed'),
  v.literal('proof_missing'),
  v.literal('dispute'),
  v.literal('cancelled'),
)

export const evidenceKindValidator = v.union(
  v.literal('facture_fne'),
  v.literal('facture_hors_fne_filon'),
  v.literal('proforma_hors_fne'),
  v.literal('recu'),
  v.literal('virement_bancaire'),
  v.literal('recu_mobile_money'),
  v.literal('bon_commande'),
  v.literal('contrat_signe'),
  v.literal('email_client'),
  v.literal('autre'),
)

export function parseAmountDue(value: string | undefined): number {
  if (!value) return 0
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0
}

export async function existingRecoveryCase(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  opportunityId: Id<'opportunities'>,
) {
  return await ctx.db
    .query('recoveryCases')
    .withIndex('by_user_opportunity', (q) =>
      q.eq('userId', userId).eq('opportunityId', opportunityId),
    )
    .first()
}

export async function ensureRecoveryCase(
  ctx: MutationCtx,
  userId: string,
  opportunity: Doc<'opportunities'>,
) {
  const existing = await existingRecoveryCase(ctx, userId, opportunity._id)
  if (existing) return existing._id

  const now = Date.now()
  const amountExpected = parseAmountDue(opportunity.compensation)
  return await ctx.db.insert('recoveryCases', {
    userId,
    opportunityId: opportunity._id,
    status: recoveryStatusFromOpportunity(opportunity),
    persona: personaFromOpportunity(opportunity),
    currency: await settingsCurrency(ctx, userId),
    fneIntegrationStatus: 'none',
    createdAt: now,
    updatedAt: now,
    ...(opportunity.companyId ? { companyId: opportunity.companyId } : {}),
    ...(opportunity.contactId ? { contactId: opportunity.contactId } : {}),
    ...(amountExpected > 0 ? { amountExpected } : {}),
    ...(opportunity.deadline ? { dueDate: opportunity.deadline } : {}),
    ...(opportunity.mailpulseContactId
      ? { mailpulseContactId: opportunity.mailpulseContactId }
      : {}),
    ...(opportunity.mailpulseSequenceId
      ? { mailpulseSequenceId: opportunity.mailpulseSequenceId }
      : {}),
  })
}

export async function serializeRecoveryCase(
  ctx: QueryCtx,
  item: Doc<'recoveryCases'>,
) {
  const opportunity = await ctx.db.get(item.opportunityId)
  const company = item.companyId ? await ctx.db.get(item.companyId) : null
  const contact = item.contactId ? await ctx.db.get(item.contactId) : null
  const proofCount = await evidenceCount(ctx, item._id)
  return {
    ...item,
    proofCount,
    balance:
      (item.amountExpected ?? 0) -
      Math.min(item.amountPaid ?? 0, item.amountExpected ?? 0),
    opportunityTitle: opportunity?.title ?? 'Opportunité',
    opportunityStage: opportunity?.stage,
    clientName: contact?.name ?? company?.name ?? 'Client',
    clientEmail: contact?.email,
    clientPhone: contact?.phone,
  }
}

async function settingsCurrency(ctx: QueryCtx | MutationCtx, userId: string) {
  const settings = await ctx.db
    .query('settings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  return settings?.currency ?? 'XOF'
}

function recoveryStatusFromOpportunity(opportunity: Doc<'opportunities'>) {
  if (opportunity.recoveryStatus === 'mailpulse_active') {
    return 'mailpulse_active' as const
  }
  if (opportunity.recoveryStatus === 'paid') return 'paid_confirmed' as const
  if (opportunity.recoveryStatus === 'cancelled') return 'cancelled' as const
  return 'to_invoice' as const
}

function personaFromOpportunity(opportunity: Doc<'opportunities'>) {
  if (opportunity.type === 'job_offer') return 'emploi' as const
  if (opportunity.type === 'mission') return 'freelance' as const
  if (opportunity.sourceChannel === 'inbound') return 'recrutement' as const
  if (opportunity.sourceChannel === 'referral') return 'relationnel' as const
  return 'commercial' as const
}

async function evidenceCount(ctx: QueryCtx, caseId: Id<'recoveryCases'>) {
  const rows = await ctx.db
    .query('recoveryEvidence')
    .withIndex('by_case', (q) => q.eq('recoveryCaseId', caseId))
    .collect()
  return rows.length
}
