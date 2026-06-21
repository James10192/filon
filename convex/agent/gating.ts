import { stepCountIs } from '@convex-dev/agent'
import type { Plan } from '../lib/plan'

/**
 * Gating de l'exposition des outils du copilote (point d'extension de la Phase
 * P3). Pour l'instant ces fonctions sont PURES et NEUTRES : elles reproduisent
 * exactement le comportement actuel (tous les outils, `stepCountIs(5)` partout).
 * Le câblage existe dès maintenant dans `aiChat.sendMessage` ; en P3 on y
 * branchera la vraie matrice plan + rôle d'organisation sans toucher au câblage.
 */

/** Rôle de l'utilisateur dans son organisation active (ou `null` hors org). */
export type OrgRole = 'owner' | 'admin' | 'manager' | 'member' | null

/**
 * Sous-ensemble d'outils exposé à un échange, selon le palier et le rôle org.
 * P1 : renvoie l'intégralité des outils (comportement identique à aujourd'hui).
 */
export function toolsFor<T extends Record<string, unknown>>(
  _plan: Plan,
  _orgRole: OrgRole,
  allTools: T,
): T {
  return allTools
}

/**
 * Condition d'arrêt (nombre d'étapes/outils chaînés) selon le palier.
 * P1 : `stepCountIs(5)` pour tous (identique à la valeur par défaut de l'agent).
 */
export function stopWhenFor(_plan: Plan) {
  return stepCountIs(5)
}
