import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { stageLabel, type Stage, type StageLabelSet } from './meta'

/**
 * Hook persona-aware pour les libelles de pipeline. Lit le `stageLabelSet` du
 * user courant (`api.users.me`, deja consomme ailleurs : pas de query lourde
 * dupliquee) et expose un resolveur `label(stage)` adapte au profil declare.
 *
 * Defaut 'emploi' tant que le profil n'est pas charge ou si la valeur est
 * absente/inconnue. Ne touche jamais aux cles internes du pipeline.
 */
export function useStageLabels(): {
  set: StageLabelSet
  label: (stage: Stage) => string
} {
  const me = useQuery(api.users.me)
  const raw = me?.stageLabelSet
  const set: StageLabelSet =
    raw === 'vente' || raw === 'recrutement' ? raw : 'emploi'
  return { set, label: (stage: Stage) => stageLabel(stage, set) }
}
