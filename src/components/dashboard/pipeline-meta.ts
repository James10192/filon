/**
 * Métadonnées partagées des stages du pipeline pour le tableau de bord.
 * Libellés FR exacts (docs/COPY.md) et tokens de couleur (docs/DESIGN.md).
 * Le code reste en anglais, l'UI en français.
 */

export type Stage =
  | 'lead'
  | 'contacted'
  | 'applied'
  | 'interview'
  | 'negotiation'
  | 'won'
  | 'lost'

export const STAGE_ORDER: Stage[] = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
]

export const STAGE_LABEL: Record<Stage, string> = {
  lead: 'Piste',
  contacted: 'Contacté',
  applied: 'Candidature envoyée',
  interview: 'Entretien',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
}

/** Variable CSS de couleur d'identification du stage (cf. tokens DESIGN.md). */
export const STAGE_COLOR_VAR: Record<Stage, string> = {
  lead: 'var(--color-stage-lead)',
  contacted: 'var(--color-stage-contacted)',
  applied: 'var(--color-stage-applied)',
  interview: 'var(--color-stage-interview)',
  negotiation: 'var(--color-stage-negotiation)',
  won: 'var(--color-stage-won)',
  lost: 'var(--color-stage-lost)',
}

/**
 * Formate un montant entier en XOF compact lisible (ex. 45000 -> « 45 000 »).
 * Pas de symbole forcé : la devise est ajoutée par l'appelant si besoin.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value)
}

/** Formate un pourcentage 0..1 -> « 42 % ». */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`
}

/**
 * Formate une date ISO (string) en libellé court FR (ex. « 14 juin »).
 * Tolérant : retourne la chaîne brute si elle n'est pas parsable.
 */
export function formatDateShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
  }).format(d)
}
