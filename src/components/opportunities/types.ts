import type { Doc } from '../../../convex/_generated/dataModel'

/**
 * Opportunité enrichie telle que renvoyée par `api.opportunities.list` et
 * `api.opportunities.board` : la ligne brute + le nom de la cible résolu
 * (companyName / contactName) + le `effectiveTargetType` dérivé.
 *
 * Typage local côté UI (le contrat backend garantit ces champs). Évite de
 * dépendre de `FunctionReturnType` partout et reste stable au switch de vue.
 */
export type EnrichedOpportunity = Doc<'opportunities'> & {
  companyName?: string
  contactName?: string
  effectiveTargetType: 'company' | 'person' | 'none'
}
