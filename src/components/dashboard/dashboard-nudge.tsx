import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useUpsell } from '~/lib/billing/use-upsell'
import { useLensSet } from '~/components/opportunities/use-stage-labels'
import { UpgradeNudge } from '~/components/billing/upgrade-nudge'

/**
 * UN seul nudge contextuel sur le tableau de bord, choisi selon l'état :
 *  - proche du plafond d'opportunités actives (>= 80 %) → friction (pipeline
 *    illimité, VRAI pour tous les métiers).
 *  - sinon, usage actif (>= 5) ET persona « emploi » → valeur veille auto.
 *
 * VÉRITÉ : la veille auto ne surveille que des sites d'offres d'emploi
 * (educarriere, Novojob). On ne la propose donc qu'au persona « emploi » ; pour
 * les autres métiers, elle n'apporte rien, et la valeur IA universelle (le
 * Copilot) est déjà portée par le Radar et les suggestions du jour.
 *
 * Tier-aware via `useUpsell().shouldNudge` : free seulement. Le cap journalier +
 * la mémoire de dismissal sont gérés par `UpgradeNudge` lui-même.
 */
export function DashboardNudge() {
  const myPlan = useQuery(api.billing.myPlan, {})
  const summary = useQuery(api.dashboard.summary, {})
  const { plan } = useUpsell()
  const lens = useLensSet()

  if (plan !== 'free') return null
  if (myPlan === undefined || myPlan === null || summary === undefined)
    return null

  const limit = myPlan.limits.activeOpportunities
  const active = summary.activeCount

  // Proche du plafond : friction (pipeline illimité, universel).
  if (limit !== null && limit > 0 && active / limit >= 0.8) {
    return <UpgradeNudge id="dashboard_near_limit" variant="friction" />
  }

  // Usage actif + persona emploi : la veille auto a un sens (sites d'emploi).
  if (active >= 5 && lens === 'emploi') {
    return <UpgradeNudge id="dashboard_active_usage" variant="value" />
  }

  return null
}
