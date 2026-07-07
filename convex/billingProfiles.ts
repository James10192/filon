import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { requireUser, type QueryCtx } from './lib/withUser'
import { requireOrgAdmin, requireOrgMember } from './lib/withOrg'
import { validationError } from './lib/plan'

const profileArgs = {
  displayName: v.string(),
  logoStorageId: v.optional(v.id('_storage')),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  country: v.optional(v.string()),
  taxId: v.optional(v.string()),
  rccm: v.optional(v.string()),
  website: v.optional(v.string()),
  accentColor: v.optional(v.string()),
  legalNote: v.optional(v.string()),
  paymentTerms: v.optional(v.string()),
  paymentDetails: v.optional(v.string()),
  signature: v.optional(v.string()),
}

const documentTypeValidator = v.union(
  v.literal('proforma_hors_fne'),
  v.literal('devis'),
  v.literal('facture_hors_fne'),
  v.literal('recu_paiement'),
)

type BillingProfile =
  | Doc<'billingProfiles'>
  | Doc<'organizationBillingProfiles'>

type ProfileInput = {
  displayName: string
  logoStorageId?: Id<'_storage'>
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  taxId?: string
  rccm?: string
  website?: string
  accentColor?: string
  legalNote?: string
  paymentTerms?: string
  paymentDetails?: string
  signature?: string
}

type ProfilePatch = {
  displayName: string
  updatedAt: number
  logoStorageId?: Id<'_storage'>
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  taxId?: string
  rccm?: string
  website?: string
  accentColor?: string
  legalNote?: string
  paymentTerms?: string
  paymentDetails?: string
  signature?: string
}

async function logoUrl(ctx: QueryCtx, storageId: Id<'_storage'> | undefined) {
  return storageId ? await ctx.storage.getUrl(storageId) : null
}

function cleanProfile(args: ProfileInput) {
  const displayName = args.displayName.trim()
  if (!displayName) {
    throw validationError('Le nom commercial est requis.')
  }
  const patch: ProfilePatch = {
    displayName,
    updatedAt: Date.now(),
  }
  if (args.logoStorageId !== undefined) patch.logoStorageId = args.logoStorageId
  const stringKeys = [
    'email',
    'phone',
    'address',
    'city',
    'country',
    'taxId',
    'rccm',
    'website',
    'accentColor',
    'legalNote',
    'paymentTerms',
    'paymentDetails',
    'signature',
  ] as const
  const target = patch as Record<string, string | number | Id<'_storage'>>
  for (const key of stringKeys) {
    const value = args[key]
    if (value !== undefined) {
      target[key] = value.trim()
    }
  }
  return patch
}

function documentPrefix(type: Doc<'billingDocuments'>['documentType']) {
  if (type === 'proforma_hors_fne') return 'FIL-PRO'
  if (type === 'facture_hors_fne') return 'FIL-FAC'
  if (type === 'recu_paiement') return 'FIL-REC'
  return 'FIL-DEV'
}

async function userFallback(ctx: QueryCtx, userId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_authId', (q) => q.eq('authId', userId))
    .unique()
}

async function serializeProfile(
  ctx: QueryCtx,
  profile: BillingProfile | null,
  fallback: { displayName: string; email?: string },
) {
  return {
    ...(profile ?? {}),
    displayName: profile?.displayName ?? fallback.displayName,
    email: profile?.email ?? fallback.email,
    logoUrl: await logoUrl(ctx, profile?.logoStorageId),
    accentColor: profile?.accentColor ?? '#4f46e5',
    legalNote:
      profile?.legalNote ??
      'Document hors FNE, non certifié par la plateforme FNE, à usage commercial ou de suivi interne selon le contexte.',
    paymentTerms: profile?.paymentTerms ?? 'Paiement à réception.',
  }
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId, email } = await requireUser(ctx)
    const user = await userFallback(ctx, userId)
    const solo = await ctx.db
      .query('billingProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    const memberships = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const activeOrgs = memberships.filter((m) => m.status === 'active')
    const organizations = []
    for (const membership of activeOrgs) {
      const org = await ctx.db.get(membership.organizationId)
      if (!org) continue
      const profile = await ctx.db
        .query('organizationBillingProfiles')
        .withIndex('by_org', (q) => q.eq('organizationId', org._id))
        .unique()
      organizations.push({
        organizationId: org._id,
        name: org.name,
        role: membership.role,
        canEdit: membership.role === 'admin',
        profile: await serializeProfile(ctx, profile, {
          displayName: org.name,
          email,
        }),
      })
    }

    return {
      solo: await serializeProfile(ctx, solo, {
        displayName: user?.name ?? email ?? 'Filon',
        email: user?.email ?? email,
      }),
      organizations,
      defaultScope:
        organizations.length > 0
          ? ({
              type: 'organization' as const,
              organizationId: organizations[0].organizationId,
            })
          : ({ type: 'user' as const }),
    }
  },
})

export const upsertMine = mutation({
  args: profileArgs,
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const existing = await ctx.db
      .query('billingProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    const patch = cleanProfile(args)
    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }
    return await ctx.db.insert('billingProfiles', {
      userId,
      displayName: patch.displayName ?? args.displayName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(patch.logoStorageId ? { logoStorageId: patch.logoStorageId } : {}),
      ...(patch.email ? { email: patch.email } : {}),
      ...(patch.phone ? { phone: patch.phone } : {}),
      ...(patch.address ? { address: patch.address } : {}),
      ...(patch.city ? { city: patch.city } : {}),
      ...(patch.country ? { country: patch.country } : {}),
      ...(patch.taxId ? { taxId: patch.taxId } : {}),
      ...(patch.rccm ? { rccm: patch.rccm } : {}),
      ...(patch.website ? { website: patch.website } : {}),
      ...(patch.accentColor ? { accentColor: patch.accentColor } : {}),
      ...(patch.legalNote ? { legalNote: patch.legalNote } : {}),
      ...(patch.paymentTerms ? { paymentTerms: patch.paymentTerms } : {}),
      ...(patch.paymentDetails ? { paymentDetails: patch.paymentDetails } : {}),
      ...(patch.signature ? { signature: patch.signature } : {}),
    })
  },
})

export const getOrganization = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const octx = await requireOrgMember(ctx, args.organizationId)
    const org = await ctx.db.get(args.organizationId)
    const profile = await ctx.db
      .query('organizationBillingProfiles')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .unique()
    return {
      organizationId: args.organizationId,
      name: org?.name ?? 'Organisation',
      canEdit: octx.role === 'admin',
      profile: await serializeProfile(ctx, profile, {
        displayName: org?.name ?? 'Organisation',
        email: octx.email,
      }),
    }
  },
})

export const upsertOrganization = mutation({
  args: { organizationId: v.id('organizations'), ...profileArgs },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId)
    const existing = await ctx.db
      .query('organizationBillingProfiles')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .unique()
    const patch = cleanProfile(args)
    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }
    return await ctx.db.insert('organizationBillingProfiles', {
      organizationId: args.organizationId,
      displayName: patch.displayName ?? args.displayName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(patch.logoStorageId ? { logoStorageId: patch.logoStorageId } : {}),
      ...(patch.email ? { email: patch.email } : {}),
      ...(patch.phone ? { phone: patch.phone } : {}),
      ...(patch.address ? { address: patch.address } : {}),
      ...(patch.city ? { city: patch.city } : {}),
      ...(patch.country ? { country: patch.country } : {}),
      ...(patch.taxId ? { taxId: patch.taxId } : {}),
      ...(patch.rccm ? { rccm: patch.rccm } : {}),
      ...(patch.website ? { website: patch.website } : {}),
      ...(patch.accentColor ? { accentColor: patch.accentColor } : {}),
      ...(patch.legalNote ? { legalNote: patch.legalNote } : {}),
      ...(patch.paymentTerms ? { paymentTerms: patch.paymentTerms } : {}),
      ...(patch.paymentDetails ? { paymentDetails: patch.paymentDetails } : {}),
      ...(patch.signature ? { signature: patch.signature } : {}),
    })
  },
})

export const allocateDocumentNumber = mutation({
  args: {
    scopeType: v.union(v.literal('user'), v.literal('organization')),
    organizationId: v.optional(v.id('organizations')),
    proposalId: v.optional(v.id('proposals')),
    recoveryCaseId: v.optional(v.id('recoveryCases')),
    documentType: documentTypeValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    let scopeKey = `user:${userId}`
    if (args.scopeType === 'organization') {
      if (!args.organizationId) {
        throw validationError('Organisation requise pour ce document.')
      }
      await requireOrgMember(ctx, args.organizationId)
      scopeKey = `organization:${args.organizationId}`
    }

    const year = new Date().getFullYear()
    const previous = await ctx.db
      .query('billingDocuments')
      .withIndex('by_scope_year_type', (q) =>
        q
          .eq('scopeKey', scopeKey)
          .eq('year', year)
          .eq('documentType', args.documentType),
      )
      .collect()
    const sequence = previous.length + 1
    const documentNumber = `${documentPrefix(args.documentType)}-${year}-${String(sequence).padStart(4, '0')}`
    const row = {
      userId,
      scopeKey,
      scopeType: args.scopeType,
      documentType: args.documentType,
      documentNumber,
      year,
      sequence,
      createdAt: Date.now(),
      ...(args.organizationId ? { organizationId: args.organizationId } : {}),
      ...(args.proposalId ? { proposalId: args.proposalId } : {}),
      ...(args.recoveryCaseId ? { recoveryCaseId: args.recoveryCaseId } : {}),
    }
    const id = await ctx.db.insert('billingDocuments', row)
    return { id, documentNumber, year, sequence }
  },
})
