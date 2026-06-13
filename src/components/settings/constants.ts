/**
 * Constantes partagees de la page Parametres.
 *
 * `DEFAULT_STAGE_LABELS` reproduit les libelles canoniques des etapes du
 * pipeline (cf. docs/COPY.md). Quand l'utilisateur ne personnalise pas ses
 * libelles, ce sont ceux-ci qui s'affichent. Les cles (code, anglais) restent
 * la source de verite metier ; seuls les libelles sont editables.
 */

/** Cle de stage (code metier, anglais) dans l'ordre canonique du pipeline. */
export type StageKey =
  | 'lead'
  | 'contacted'
  | 'applied'
  | 'interview'
  | 'negotiation'
  | 'won'
  | 'lost'

/** Ordre canonique des etapes, de la piste a la cloture. */
export const STAGE_ORDER: StageKey[] = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
]

/** Libelles FR par defaut, alignes sur docs/COPY.md. */
export const DEFAULT_STAGE_LABELS: Record<StageKey, string> = {
  lead: 'Piste',
  contacted: 'Contacté',
  applied: 'Candidature envoyée',
  interview: 'Entretien',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
}

/** Couleur d'identification (token CSS) de chaque stage, pour le point repere. */
export const STAGE_COLOR_VAR: Record<StageKey, string> = {
  lead: 'var(--color-stage-lead)',
  contacted: 'var(--color-stage-contacted)',
  applied: 'var(--color-stage-applied)',
  interview: 'var(--color-stage-interview)',
  negotiation: 'var(--color-stage-negotiation)',
  won: 'var(--color-stage-won)',
  lost: 'var(--color-stage-lost)',
}

/** Devises proposees (Afrique de l'Ouest en tete, cf. contexte produit). */
export const CURRENCIES: { value: string; label: string }[] = [
  { value: 'XOF', label: 'XOF · Franc CFA (UEMOA)' },
  { value: 'XAF', label: 'XAF · Franc CFA (CEMAC)' },
  { value: 'EUR', label: 'EUR · Euro' },
  { value: 'USD', label: 'USD · Dollar américain' },
  { value: 'GBP', label: 'GBP · Livre sterling' },
  { value: 'MAD', label: 'MAD · Dirham marocain' },
  { value: 'NGN', label: 'NGN · Naira nigérian' },
  { value: 'CAD', label: 'CAD · Dollar canadien' },
]

/**
 * Convertit un tableau de libelles personnalises (ordre = STAGE_ORDER) en
 * dictionnaire par cle de stage, en retombant sur les defauts pour les entrees
 * vides ou manquantes.
 */
export function stageLabelsFromArray(
  stored: string[] | undefined,
): Record<StageKey, string> {
  if (!stored || stored.length === 0) {
    return { ...DEFAULT_STAGE_LABELS }
  }
  const result = { ...DEFAULT_STAGE_LABELS }
  STAGE_ORDER.forEach((key, index) => {
    const label = stored[index]?.trim()
    if (label) result[key] = label
  })
  return result
}

/** Serialise un dictionnaire de libelles en tableau ordonne (STAGE_ORDER). */
export function stageLabelsToArray(
  labels: Record<StageKey, string>,
): string[] {
  return STAGE_ORDER.map((key) => labels[key].trim() || DEFAULT_STAGE_LABELS[key])
}

/** Vrai si les libelles fournis sont identiques aux defauts du produit. */
export function isDefaultStageLabels(
  labels: Record<StageKey, string>,
): boolean {
  return STAGE_ORDER.every(
    (key) => (labels[key].trim() || DEFAULT_STAGE_LABELS[key]) === DEFAULT_STAGE_LABELS[key],
  )
}
