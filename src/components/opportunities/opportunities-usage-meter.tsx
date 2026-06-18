import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { useUpsell } from '~/lib/billing/use-upsell'
import { UsageMeter } from '~/components/billing/usage-meter'

/**
 * Compteur d'usage des opportunités actives pour l'espace Opportunités.
 * Lit le cap du palier courant (api.billing.myPlan → limits) et le nombre
 * d'opportunités actives (api.dashboard.summary → activeCount). Discret loin
 * du plafond, devient une invitation à l'approche. Rien pour les payeurs
 * (UsageMeter masque tout si plan != free ou limite illimitée).
 */
export function OpportunitiesUsageMeter() {
  const myPlan = useQuery(api.billing.myPlan, {})
  const summary = useQuery(api.dashboard.summary, {})
  const { plan } = useUpsell()

  // Aucun bruit pour les payeurs, ni tant que les données ne sont pas prêtes.
  if (plan !== 'free') return null
  if (myPlan === undefined || myPlan === null || summary === undefined)
    return null

  const limit = myPlan.limits.activeOpportunities
  if (limit === null) return null

  return (
    <UsageMeter
      label={m.opp_usage_active_label()}
      used={summary.activeCount}
      limit={limit}
      className="mb-4"
    />
  )
}
