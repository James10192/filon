import { stepCountIs } from '@convex-dev/agent'
import type { Plan } from '../lib/plan'
import type { OrgRole } from '../lib/withOrg'
import { isToolExposed } from './tools/manifest'

/**
 * Gating de l'exposition des outils du copilote (Phase P3). L'exposition réelle
 * par échange est calculée à partir d'une UNIQUE source de vérité, le manifeste
 * (`tools/manifest`) : palier + rôle d'org → sous-ensemble d'outils. Garantit
 * qu'un utilisateur ne voit jamais plus de ~14 outils, et que les outils équipe
 * (`team_overview`, `flag_priority`, `unflag_priority`) restent réservés aux
 * managers (admin / head_sell). Câblé dans `aiChat.sendMessage`.
 */

/** Rôle de l'utilisateur dans son organisation active (ou `null` hors org). */
export type GatingOrgRole = OrgRole | null

/**
 * Sous-ensemble d'outils exposé à un échange, selon le palier et le rôle d'org.
 * Filtre `allTools` via le manifeste : un outil absent du manifeste ou non
 * autorisé est retiré (fail closed). Le type de retour reste `T` (sous-ensemble
 * runtime des MÊMES définitions d'outils) : l'agent ne peut appeler que les
 * outils réellement présents, sans dégrader le typage de la boîte à outils.
 */
export function toolsFor<T extends Record<string, unknown>>(
  plan: Plan,
  orgRole: GatingOrgRole,
  allTools: T,
): T {
  const out: Record<string, unknown> = {}
  for (const name of Object.keys(allTools)) {
    if (isToolExposed(name, plan, orgRole)) out[name] = allTools[name]
  }
  return out as T
}

/**
 * Condition d'arrêt (nombre d'étapes/outils chaînés) selon le palier. Copilot Max
 * peut enchaîner davantage d'étapes (8) pour les workflows composites ; les
 * autres paliers sont limités à 5.
 */
export function stopWhenFor(plan: Plan) {
  return stepCountIs(plan === 'copilot_max' ? 8 : 5)
}
