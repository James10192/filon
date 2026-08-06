import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../lib/withUser'
import { forbiddenError, notFoundError } from '../lib/plan'

async function requireOwned<T extends 'contacts' | 'companies' | 'relationships' | 'needs' | 'opportunities'>(
  ctx: MutationCtx,
  userId: string,
  table: T,
  id: Id<T>,
  label: string,
): Promise<Doc<T>> {
  const document = await ctx.db.get(id)
  if (!document) throw notFoundError(`${label} introuvable`)
  if (document.userId !== userId) throw forbiddenError('Non autorisé')
  return document
}

export const requireOwnedContact = (ctx: MutationCtx, userId: string, id: Id<'contacts'>) =>
  requireOwned(ctx, userId, 'contacts', id, 'Contact')

export const requireOwnedCompany = (ctx: MutationCtx, userId: string, id: Id<'companies'>) =>
  requireOwned(ctx, userId, 'companies', id, 'Entreprise')

export const requireOwnedRelationship = (ctx: MutationCtx, userId: string, id: Id<'relationships'>) =>
  requireOwned(ctx, userId, 'relationships', id, 'Relation')

export const requireOwnedNeed = (ctx: MutationCtx, userId: string, id: Id<'needs'>) =>
  requireOwned(ctx, userId, 'needs', id, 'Besoin')

export const requireOwnedOpportunity = (ctx: MutationCtx, userId: string, id: Id<'opportunities'>) =>
  requireOwned(ctx, userId, 'opportunities', id, 'Deal')
