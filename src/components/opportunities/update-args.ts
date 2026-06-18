import type { Id } from '../../../convex/_generated/dataModel'
import type { OpportunityFormSubmit } from './opportunity-form'

/**
 * Mappe les valeurs du formulaire vers les arguments de `api.opportunities.update`.
 *
 * Forwarde TOUS les champs de cible (targetType / companyId / contactId) et de
 * source (sourceChannel / sourceDetail / source libre) en plus des champs de
 * base. Les champs cible non pertinents sont remis à `none` / absents pour que
 * l'édition puisse aussi détacher une cible (ex. passage entreprise -> aucune).
 *
 * Construction dynamique : on n'envoie jamais `undefined` à Convex (chaînes
 * vides envoyées pour effacer un champ texte, ids omis quand absents).
 */
export function buildUpdateArgs(
  id: Id<'opportunities'>,
  values: OpportunityFormSubmit,
): {
  id: Id<'opportunities'>
  title: string
  type: OpportunityFormSubmit['type']
  targetType: OpportunityFormSubmit['targetType']
  tags: string[]
  source: string
  sourceDetail: string
  url: string
  location: string
  compensation: string
  description: string
  companyId?: Id<'companies'>
  contactId?: Id<'contacts'>
  sourceChannel?: OpportunityFormSubmit['sourceChannel']
  deadline?: string
  nextActionAt?: string
} {
  const args: ReturnType<typeof buildUpdateArgs> = {
    id,
    title: values.title,
    type: values.type,
    targetType: values.targetType,
    tags: values.tags,
    // Chaînes vides => effacement explicite côté patch (jamais d'undefined).
    source: values.source ?? '',
    sourceDetail: values.sourceDetail ?? '',
    url: values.url ?? '',
    location: values.location ?? '',
    compensation: values.compensation ?? '',
    description: values.description ?? '',
  }
  // Cible : rattachée seulement si l'id correspond au type choisi.
  if (values.targetType === 'company' && values.companyId) {
    args.companyId = values.companyId
  }
  if (values.targetType === 'person' && values.contactId) {
    args.contactId = values.contactId
  }
  // sourceChannel est une union : on n'envoie la clé que si définie (sinon le
  // validateur Convex refuserait une chaîne vide).
  if (values.sourceChannel) args.sourceChannel = values.sourceChannel
  if (values.deadline) args.deadline = values.deadline
  if (values.nextActionAt) args.nextActionAt = values.nextActionAt
  return args
}
