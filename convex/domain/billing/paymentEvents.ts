/**
 * Idempotence des effets financiers. La référence Paystack est le verrou métier
 * unique : le retour de checkout et les retries webhook convergent ici.
 */
import type { MutationCtx } from '../../lib/withUser'

export async function claimPaymentEvent(
  ctx: MutationCtx,
  userId: string,
  reference: string,
  type: 'credit_pack',
): Promise<boolean> {
  const existing = await ctx.db
    .query('billingEvents')
    .withIndex('by_provider_event', (q) =>
      q.eq('provider', 'paystack').eq('providerEventId', reference),
    )
    .unique()
  if (existing) return false
  const now = Date.now()
  await ctx.db.insert('billingEvents', {
    userId,
    provider: 'paystack',
    providerEventId: reference,
    type,
    status: 'processed',
    createdAt: now,
    processedAt: now,
  })
  return true
}
