import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { currentPlan, requireUser, type QueryCtx } from './lib/withUser'
import { requireOrgAdmin, requireOrgMember } from './lib/withOrg'
import { forbiddenError, validationError } from './lib/plan'

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

const documentLanguageValidator = v.union(v.literal('fr'), v.literal('en'))

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
    if (args.proposalId) {
      const existing = await ctx.db
        .query('billingDocuments')
        .withIndex('by_proposal_type', (q) =>
          q.eq('proposalId', args.proposalId).eq('documentType', args.documentType),
        )
        .first()
      if (existing && existing.userId === userId) {
        return {
          id: existing._id,
          documentNumber: existing.documentNumber,
          year: existing.year,
          sequence: existing.sequence,
        }
      }
    }
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

type PreviewLine = { label: string; description?: string; quantity: number; unitPrice: number }

function commercialTotals(
  lines: PreviewLine[],
  discount: { type: 'fixed' | 'percent'; value: number } | undefined,
  taxes: Array<{ label: string; rate: number }> | undefined,
) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const discountAmount = discount
    ? Math.min(subtotal, discount.type === 'percent' ? subtotal * discount.value / 100 : discount.value)
    : 0
  const taxable = subtotal - discountAmount
  const taxAmount = (taxes ?? []).reduce((sum, tax) => sum + taxable * tax.rate / 100, 0)
  return { subtotal, total: taxable + taxAmount }
}

function snapshotRecipient(
  proposal: Doc<'proposals'>,
  company: Doc<'companies'> | null,
  contact: Doc<'contacts'> | null,
) {
  if (proposal.billingRecipient) return proposal.billingRecipient
  if (contact) {
    return {
      name: contact.name,
      ...(contact.role ? { attention: contact.role } : {}),
      ...(contact.email ? { email: contact.email } : {}),
      ...(contact.phone ? { phone: contact.phone } : {}),
      ...(contact.location ? { city: contact.location } : {}),
    }
  }
  if (company) {
    return {
      name: company.name,
      ...(company.location ? { city: company.location } : {}),
    }
  }
  return { name: '' }
}

async function previewData(ctx: QueryCtx, userId: string, proposalId: Id<'proposals'>) {
  const proposal = await ctx.db.get(proposalId)
  if (!proposal) throw validationError('Proposition introuvable.')
  if (proposal.userId !== userId) throw forbiddenError('Non autorisé')

  const recipientRow = await ctx.db
    .query('proposalRecipients')
    .withIndex('by_proposal', (q) => q.eq('proposalId', proposalId))
    .first()
  const company = proposal.companyId ? await ctx.db.get(proposal.companyId) : null
  const contact = recipientRow?.contactId ? await ctx.db.get(recipientRow.contactId) : null
  const recipientCompany = recipientRow?.companyId ? await ctx.db.get(recipientRow.companyId) : null
  const selectedCompany = recipientCompany?.userId === userId ? recipientCompany : company?.userId === userId ? company : null
  const selectedContact = contact?.userId === userId ? contact : null

  const memberships = await ctx.db
    .query('memberships')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const activeMembership = memberships.find((membership) => membership.status === 'active')
  const organization = activeMembership ? await ctx.db.get(activeMembership.organizationId) : null
  const organizationProfile = organization && activeMembership
    ? await ctx.db.query('organizationBillingProfiles').withIndex('by_org', (q) => q.eq('organizationId', organization._id)).unique()
    : null
  const user = await userFallback(ctx, userId)
  const soloProfile = await ctx.db.query('billingProfiles').withIndex('by_user', (q) => q.eq('userId', userId)).unique()
  const useOrganization = Boolean(organization && activeMembership && organizationProfile)
  const profile = await serializeProfile(
    ctx,
    useOrganization ? organizationProfile : soloProfile,
    { displayName: useOrganization ? organization!.name : user?.name ?? 'Filon', email: user?.email },
  )
  const issuer = {
    name: profile.displayName,
    ...(profile.logoUrl ? { logoUrl: profile.logoUrl } : {}),
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.phone ? { phone: profile.phone } : {}),
    ...(profile.address ? { address: profile.address } : {}),
    ...(profile.city ? { city: profile.city } : {}),
    ...(profile.country ? { country: profile.country } : {}),
    ...(profile.taxId ? { taxId: profile.taxId } : {}),
    ...(profile.rccm ? { rccm: profile.rccm } : {}),
    ...(profile.website ? { website: profile.website } : {}),
    ...(profile.accentColor ? { accentColor: profile.accentColor } : {}),
    ...(profile.legalNote ? { legalNote: profile.legalNote } : {}),
    ...(profile.paymentTerms ? { paymentTerms: profile.paymentTerms } : {}),
    ...(profile.paymentDetails ? { paymentDetails: profile.paymentDetails } : {}),
    ...(profile.signature ? { signature: profile.signature } : {}),
  }
  const documentType = proposal.kind === 'proforma' ? 'proforma_hors_fne' as const : 'devis' as const
  const billingDocument = await ctx.db.query('billingDocuments')
    .withIndex('by_proposal_type', (q) => q.eq('proposalId', proposalId).eq('documentType', documentType))
    .first()
  const lines: PreviewLine[] = proposal.lineItems?.length
    ? proposal.lineItems
    : [{ label: proposal.title, description: proposal.pitch, quantity: 1, unitPrice: proposal.amount ?? 0 }]
  const totals = commercialTotals(lines, proposal.discount, proposal.taxes)
  const checklist: string[] = []
  if (!issuer.name.trim()) checklist.push("L'identité de facturation doit être renseignée.")
  if (!snapshotRecipient(proposal, selectedCompany, selectedContact).name.trim()) checklist.push('Le client est requis.')
  if (!proposal.currency?.trim()) checklist.push('La devise est requise.')
  if (!lines.some((line) => line.label.trim() && line.quantity > 0)) checklist.push('Ajoutez au moins une ligne commerciale valide.')
  const plan = await currentPlan(ctx, userId)
  return {
    proposalId,
    canFinalize: checklist.length === 0,
    checklist,
    scopeType: useOrganization ? 'organization' as const : 'user' as const,
    ...(useOrganization && organization ? { organizationId: organization._id } : {}),
    document: {
      documentType,
      ...(billingDocument ? { documentNumber: billingDocument.documentNumber, issuedAt: billingDocument.issuedAt, revision: billingDocument.currentRevision } : {}),
      draft: !billingDocument,
      language: proposal.documentLanguage ?? 'fr' as const,
      brandMode: plan === 'free' ? 'cobranded' as const : 'white_label' as const,
      issuedAt: billingDocument?.issuedAt ?? Date.now(),
      title: proposal.title,
      ...(proposal.validUntil ? { validUntil: proposal.validUntil } : {}),
      issuer,
      recipient: snapshotRecipient(proposal, selectedCompany, selectedContact),
      lines,
      currency: proposal.currency ?? 'XOF',
      ...(proposal.discount ? { discount: proposal.discount } : {}),
      ...(proposal.taxes ? { taxes: proposal.taxes } : {}),
      ...(proposal.depositAmount !== undefined ? { depositAmount: proposal.depositAmount } : {}),
      ...(proposal.pitch ? { pitch: proposal.pitch } : {}),
      ...(proposal.terms ? { terms: proposal.terms } : {}),
      ...(proposal.clientNote ? { clientNote: proposal.clientNote } : {}),
    },
    total: totals.total,
  }
}

/** Données de l'aperçu PDF, résolues côté serveur avec le scope utilisateur. */
export const proposalPreview = query({
  args: { proposalId: v.id('proposals') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    return previewData(ctx, userId, args.proposalId)
  },
})

/** Réserve ou réutilise une révision, sans jamais consommer un second numéro. */
export const reserveProposalRevision = mutation({
  args: {
    proposalId: v.id('proposals'),
    scopeType: v.union(v.literal('user'), v.literal('organization')),
    organizationId: v.optional(v.id('organizations')),
    documentType: documentTypeValidator,
    contentHash: v.string(),
    snapshot: v.string(),
    language: documentLanguageValidator,
    brandMode: v.union(v.literal('cobranded'), v.literal('white_label')),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const proposal = await ctx.db.get(args.proposalId)
    if (!proposal || proposal.userId !== userId) throw forbiddenError('Non autorisé')
    let scopeKey = `user:${userId}`
    if (args.scopeType === 'organization') {
      if (!args.organizationId) throw validationError('Organisation requise.')
      await requireOrgMember(ctx, args.organizationId)
      scopeKey = `organization:${args.organizationId}`
    }
    let billingDocument = await ctx.db.query('billingDocuments')
      .withIndex('by_proposal_type', (q) => q.eq('proposalId', args.proposalId).eq('documentType', args.documentType))
      .first()
    const now = Date.now()
    if (!billingDocument) {
      const year = new Date(now).getFullYear()
      const previous = await ctx.db.query('billingDocuments').withIndex('by_scope_year_type', (q) => q.eq('scopeKey', scopeKey).eq('year', year).eq('documentType', args.documentType)).collect()
      const sequence = previous.length + 1
      const documentNumber = `${documentPrefix(args.documentType)}-${year}-${String(sequence).padStart(4, '0')}`
      const id = await ctx.db.insert('billingDocuments', {
        userId, scopeKey, scopeType: args.scopeType, documentType: args.documentType,
        documentNumber, year, sequence, issuedAt: now, currentRevision: 0, createdAt: now,
        ...(args.organizationId ? { organizationId: args.organizationId } : {}), proposalId: args.proposalId,
      })
      billingDocument = await ctx.db.get(id)
    }
    if (!billingDocument) throw validationError('Impossible de réserver le document.')
    const same = await ctx.db.query('billingDocumentRevisions').withIndex('by_document_hash', (q) => q.eq('billingDocumentId', billingDocument!._id).eq('contentHash', args.contentHash)).first()
    if (same) {
      if (same.status === 'failed') await ctx.db.patch(same._id, { status: 'generating', updatedAt: now })
      return {
        revisionId: same._id,
        documentNumber: billingDocument.documentNumber,
        revision: same.revision,
        issuedAt: billingDocument.issuedAt ?? now,
        reused: same.status === 'ready',
        ...(same.status === 'ready' && same.storageId ? { url: await ctx.storage.getUrl(same.storageId) } : {}),
      }
    }
    const revision = (billingDocument.currentRevision ?? 0) + 1
    const revisionId = await ctx.db.insert('billingDocumentRevisions', {
      userId, billingDocumentId: billingDocument._id, proposalId: args.proposalId, revision,
      contentHash: args.contentHash, snapshot: args.snapshot, plan: await currentPlan(ctx, userId),
      brandMode: args.brandMode, language: args.language, status: 'generating', createdAt: now, updatedAt: now,
    })
    await ctx.db.patch(billingDocument._id, { currentRevision: revision })
    return { revisionId, documentNumber: billingDocument.documentNumber, revision, issuedAt: billingDocument.issuedAt ?? now, reused: false }
  },
})

export const finalizeProposalRevision = mutation({
  args: { revisionId: v.id('billingDocumentRevisions'), storageId: v.id('_storage'), filename: v.string(), size: v.number() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const revision = await ctx.db.get(args.revisionId)
    if (!revision || revision.userId !== userId) throw forbiddenError('Non autorisé')
    if (revision.status === 'ready' && revision.storageId) return { url: await ctx.storage.getUrl(revision.storageId) }
    const billingDocument = await ctx.db.get(revision.billingDocumentId)
    if (!billingDocument) throw validationError('Document introuvable.')
    const kind = billingDocument.documentType === 'devis' ? 'devis' as const : 'proforma' as const
    const documentId = await ctx.db.insert('documents', { userId, name: args.filename, kind, storageId: args.storageId, size: args.size, createdAt: Date.now() })
    await ctx.db.insert('documentLinks', { userId, documentId, entityType: 'proposal', entityId: String(revision.proposalId), createdAt: Date.now() })
    await ctx.db.patch(revision._id, { status: 'ready', storageId: args.storageId, documentId, filename: args.filename, size: args.size, generatedAt: Date.now(), updatedAt: Date.now() })
    return { url: await ctx.storage.getUrl(args.storageId) }
  },
})

export const failProposalRevision = mutation({
  args: { revisionId: v.id('billingDocumentRevisions'), message: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const revision = await ctx.db.get(args.revisionId)
    if (!revision || revision.userId !== userId) throw forbiddenError('Non autorisé')
    if (revision.status !== 'ready') await ctx.db.patch(revision._id, { status: 'failed', failureMessage: args.message.slice(0, 500), updatedAt: Date.now() })
    return null
  },
})
