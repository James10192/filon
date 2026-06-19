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
  const set = useLensSet()
  return { set, label: (stage: Stage) => stageLabel(stage, set) }
}

/**
 * Variante legere : ne renvoie que le jeu d'etiquettes (`set`) du user courant,
 * pour les consommateurs persona-aware qui resolvent eux-memes leurs libelles
 * (types, champs, proposition...) via les helpers de `meta.ts`. Reutilise la
 * meme lecture `api.users.me` (pas de query lourde dupliquee). Defaut 'emploi'.
 */
export function useLensSet(): StageLabelSet {
  const me = useQuery(api.users.me)
  const raw = me?.stageLabelSet
  return raw === 'vente' || raw === 'recrutement' ? raw : 'emploi'
}
