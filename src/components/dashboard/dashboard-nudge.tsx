import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useUpsell } from '~/lib/billing/use-upsell'
import { UpgradeNudge } from '~/components/billing/upgrade-nudge'

/**
 * UN seul nudge contextuel sur le tableau de bord, choisi selon l'état :
 *  - proche du plafond d'opportunités actives (>= 80 %) → nudge de friction.
 *  - sinon, usage actif (>= 5 opportunités actives)     → nudge de valeur.
 *
 * Tier-aware via `useUpsell().shouldNudge` : free seulement (pro/pro_ai ne
 * voient pas ces nudges Pro). Le cap journalier + la mémoire de dismissal sont
 * gérés par `UpgradeNudge` lui-même.
 */
export function DashboardNudge() {
  const myPlan = useQuery(api.billing.myPlan, {})
  const summary = useQuery(api.dashboard.summary, {})
  const { plan } = useUpsell()

  if (plan !== 'free') return null
  if (myPlan === undefined || myPlan === null || summary === undefined)
    return null

  const limit = myPlan.limits.activeOpportunities
  const active = summary.activeCount

  // Proche du plafond : on privilégie la friction (la plus pertinente).
  if (limit !== null && limit > 0 && active / limit >= 0.8) {
    return <UpgradeNudge id="dashboard_near_limit" variant="friction" />
  }

  // Usage actif sans urgence : invitation de valeur (proactive, séduisante).
  if (active >= 5) {
    return <UpgradeNudge id="dashboard_active_usage" variant="value" />
  }

  return null
}
