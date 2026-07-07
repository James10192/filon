import { v } from 'convex/values'
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import {
  requireUser,
  requireUserFromAction,
  type MutationCtx,
} from './lib/withUser'
import { forbiddenError, notFoundError, validationError } from './lib/plan'
import {
  ensureRecoveryCase,
  parseAmountDue,
} from './lib/recoveryCaseHelpers'

const DEFAULT_DELAY_DAYS = 3
const FOLLOWUP_LABEL = 'VÃ©rifier si le paiement a Ã©tÃ© reÃ§u'
const DEFAULT_MAILPULSE_URL = 'https://mailpulse-two.vercel.app'
const MAILPULSE_RECOVERY_STATUSES = new Set([
  'mailpulse_pending',
  'mailpulse_active',
])

type MailpulseRecoveryResponse = {
  status?: string
  mailpulseContactId?: string
  mailpulseSequenceId?: string
  error?: { message?: string }
}

async function ownedOpportunity(
  ctx: MutationCtx,
  userId: string,
  id: Id<'opportunities'>,
): Promise<Doc<'opportunities'>> {
  const opportunity = await ctx.db.get(id)
  if (!opportunity) throw notFoundError('Introuvable')
  if (opportunity.userId !== userId) throw forbiddenError('Non autorise')
  return opportunity
}

async function recoveryDelayDays(
  ctx: MutationCtx,
  userId: string,
): Promise<number> {
  const settings = await ctx.db
    .query('settings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  const value = settings?.recoveryReminderDelayDays ?? DEFAULT_DELAY_DAYS
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DELAY_DAYS
}

function dueDateForDelay(delayDays: number): string {
  const due = new Date()
  due.setDate(due.getDate() + delayDays)
  return due.toISOString()
}

function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed || trimmed.includes('@')) return DEFAULT_MAILPULSE_URL

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (!url.hostname.includes('.')) return DEFAULT_MAILPULSE_URL
    return url.origin.replace(/\/+$/, '')
  } catch {
    return DEFAULT_MAILPULSE_URL
  }
}

function statusFromMailpulse(status: string | undefined) {
  if (status === 'active') return 'mailpulse_active' as const
  return 'mailpulse_pending' as const
}

export const listMailpulseRecoveries = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    const rows = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    return rows
      .filter((opportunity) =>
        MAILPULSE_RECOVERY_STATUSES.has(opportunity.recoveryStatus ?? ''),
      )
      .sort(
        (a, b) =>
          (b.mailpulseLastSyncAt ?? b.updatedAt) -
          (a.mailpulseLastSyncAt ?? a.updatedAt),
      )
      .map((opportunity) => ({
        _id: opportunity._id,
        title: opportunity.title,
        status: opportunity.recoveryStatus,
        ...(opportunity.compensation
          ? { compensation: opportunity.compensation }
          : {}),
        ...(opportunity.deadline ? { deadline: opportunity.deadline } : {}),
        ...(opportunity.mailpulseLastSyncAt
          ? { mailpulseLastSyncAt: opportunity.mailpulseLastSyncAt }
          : {}),
        ...(opportunity.mailpulseContactId
          ? { mailpulseContactId: opportunity.mailpulseContactId }
          : {}),
        ...(opportunity.mailpulseSequenceId
          ? { mailpulseSequenceId: opportunity.mailpulseSequenceId }
          : {}),
      }))
  },
})

export const markPrompted = mutation({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const opportunity = await ownedOpportunity(ctx, userId, args.opportunityId)
    if (opportunity.stage !== 'won') {
      throw validationError('Le recouvrement concerne une opportunitÃ© gagnÃ©e')
    }
    if (opportunity.recoveryStatus !== undefined) return null

    await ensureRecoveryCase(ctx, userId, opportunity)
    await ctx.db.patch(args.opportunityId, {
      recoveryStatus: 'prompted',
      recoveryPromptedAt: Date.now(),
      updatedAt: Date.now(),
    })
    return null
  },
})

export const createManualFollowup = mutation({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const opportunity = await ownedOpportunity(ctx, userId, args.opportunityId)
    if (opportunity.stage !== 'won') {
      throw validationError('Le recouvrement concerne une opportunitÃ© gagnÃ©e')
    }
    if (opportunity.recoveryFollowupId) return opportunity.recoveryFollowupId

    const now = Date.now()
    const caseId = await ensureRecoveryCase(ctx, userId, opportunity)
    const followupId = await ctx.db.insert('followups', {
      userId,
      opportunityId: args.opportunityId,
      label: FOLLOWUP_LABEL,
      dueDate: dueDateForDelay(await recoveryDelayDays(ctx, userId)),
      done: false,
      createdAt: now,
    })

    await ctx.db.patch(args.opportunityId, {
      recoveryStatus: 'manual_followup',
      recoveryPromptedAt: opportunity.recoveryPromptedAt ?? now,
      recoveryFollowupId: followupId,
      updatedAt: now,
    })
    await ctx.db.patch(caseId, {
      status: 'waiting_payment',
      nextInternalCheckAt: dueDateForDelay(await recoveryDelayDays(ctx, userId)),
      updatedAt: now,
    })
    return followupId
  },
})

export const markMailpulsePending = mutation({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const opportunity = await ownedOpportunity(ctx, userId, args.opportunityId)
    if (opportunity.stage !== 'won') {
      throw validationError('Le recouvrement concerne une opportunitÃ© gagnÃ©e')
    }
    const now = Date.now()
    const caseId = await ensureRecoveryCase(ctx, userId, opportunity)
    await ctx.db.patch(args.opportunityId, {
      recoveryStatus: 'mailpulse_pending',
      recoveryPromptedAt: opportunity.recoveryPromptedAt ?? now,
      mailpulseLastSyncAt: now,
      updatedAt: now,
    })
    await ctx.db.patch(caseId, {
      status: 'waiting_payment',
      updatedAt: now,
      ...(opportunity.deadline ? { nextClientReminderAt: opportunity.deadline } : {}),
    })
    return null
  },
})

export const loadMailpulseRecoveryContext = internalQuery({
  args: {
    userId: v.string(),
    opportunityId: v.id('opportunities'),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.opportunityId)
    if (!opportunity) throw notFoundError('Introuvable')
    if (opportunity.userId !== args.userId) {
      throw forbiddenError('Non autorise')
    }
    if (opportunity.stage !== 'won') {
      throw validationError('Le recouvrement concerne une opportunitÃ© gagnÃ©e')
    }

    const settings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique()
    const apiKey = settings?.mailpulseApiKey?.trim()
    if (!apiKey) {
      throw validationError('Configurez une clÃ© API MailPulse avant de lancer le recouvrement')
    }

    const contact = opportunity.contactId
      ? await ctx.db.get(opportunity.contactId)
      : null
    const company = opportunity.companyId
      ? await ctx.db.get(opportunity.companyId)
      : null
    const ownedContact =
      contact && contact.userId === args.userId ? contact : null
    const ownedCompany =
      company && company.userId === args.userId ? company : null

    const clientEmail = ownedContact?.email?.trim()
    if (!clientEmail) {
      throw validationError('Ajoutez un email client avant de lancer MailPulse')
    }

    const dueDate =
      opportunity.deadline?.trim() || new Date().toISOString().slice(0, 10)
    const clientName =
      ownedContact?.name?.trim() ||
      ownedCompany?.name?.trim() ||
      opportunity.title

    return {
      baseUrl: normalizeBaseUrl(settings?.mailpulseBaseUrl),
      apiKey,
      payload: {
        source: 'filon' as const,
        opportunityId: args.opportunityId,
        workspaceId: settings?.mailpulseWorkspaceId,
        userId: args.userId,
        clientName,
        clientEmail,
        clientPhone: ownedContact?.phone,
        amountDue: parseAmountDue(opportunity.compensation),
        currency: settings?.currency ?? 'XOF',
        dueDate,
      },
    }
  },
})

export const applyMailpulseRecoveryResult = internalMutation({
  args: {
    userId: v.string(),
    opportunityId: v.id('opportunities'),
    status: v.optional(v.string()),
    mailpulseContactId: v.optional(v.string()),
    mailpulseSequenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const opportunity = await ownedOpportunity(ctx, args.userId, args.opportunityId)
    const now = Date.now()
    const patch: Partial<Doc<'opportunities'>> = {
      recoveryStatus: statusFromMailpulse(args.status),
      recoveryPromptedAt: opportunity.recoveryPromptedAt ?? now,
      mailpulseLastSyncAt: now,
      updatedAt: now,
    }
    if (args.mailpulseContactId !== undefined) {
      patch.mailpulseContactId = args.mailpulseContactId
    }
    if (args.mailpulseSequenceId !== undefined) {
      patch.mailpulseSequenceId = args.mailpulseSequenceId
    }
    await ctx.db.patch(args.opportunityId, patch)
    const caseId = await ensureRecoveryCase(ctx, args.userId, opportunity)
    await ctx.db.patch(caseId, {
      status:
        statusFromMailpulse(args.status) === 'mailpulse_active'
          ? 'mailpulse_active'
          : 'waiting_payment',
      updatedAt: now,
      ...(args.mailpulseContactId ? { mailpulseContactId: args.mailpulseContactId } : {}),
      ...(args.mailpulseSequenceId ? { mailpulseSequenceId: args.mailpulseSequenceId } : {}),
    })
    return null
  },
})

export const startMailpulseRecovery = action({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUserFromAction(ctx)
    const recoveryContext = await ctx.runQuery(
      internal.recovery.loadMailpulseRecoveryContext,
      { userId, opportunityId: args.opportunityId },
    )

    const response = await fetch(
      `${recoveryContext.baseUrl}/api/integrations/filon/recovery`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${recoveryContext.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recoveryContext.payload),
      },
    )
    const body = (await response
      .json()
      .catch(() => null)) as MailpulseRecoveryResponse | null
    if (!response.ok) {
      throw validationError(
        body?.error?.message ?? "MailPulse n'a pas acceptÃ© cette opportunitÃ©",
      )
    }

    await ctx.runMutation(internal.recovery.applyMailpulseRecoveryResult, {
      userId,
      opportunityId: args.opportunityId,
      ...(body?.status ? { status: body.status } : {}),
      ...(body?.mailpulseContactId
        ? { mailpulseContactId: body.mailpulseContactId }
        : {}),
      ...(body?.mailpulseSequenceId
        ? { mailpulseSequenceId: body.mailpulseSequenceId }
        : {}),
    })
    return body
  },
})

export const syncMailpulseRecoveryStatus = action({
  args: { opportunityId: v.id('opportunities') },
  handler: async (ctx, args) => {
    const { userId } = await requireUserFromAction(ctx)
    const recoveryContext = await ctx.runQuery(
      internal.recovery.loadMailpulseRecoveryContext,
      { userId, opportunityId: args.opportunityId },
    )
    const url = new URL(
      '/api/integrations/filon/recovery/status',
      recoveryContext.baseUrl,
    )
    url.searchParams.set('filonOpportunityId', recoveryContext.payload.opportunityId)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${recoveryContext.apiKey}` },
    })
    const body = (await response
      .json()
      .catch(() => null)) as MailpulseRecoveryResponse | null
    if (!response.ok) {
      throw validationError(
        body?.error?.message ?? 'Statut MailPulse indisponible pour ce dossier',
      )
    }

    await ctx.runMutation(internal.recovery.applyMailpulseRecoveryResult, {
      userId,
      opportunityId: args.opportunityId,
      ...(body?.status ? { status: body.status } : {}),
      ...(body?.mailpulseContactId
        ? { mailpulseContactId: body.mailpulseContactId }
        : {}),
      ...(body?.mailpulseSequenceId
        ? { mailpulseSequenceId: body.mailpulseSequenceId }
        : {}),
    })
    return body
  },
})
