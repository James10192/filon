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

/** Libellé court du stage (pour les zones denses : segments, axes). */
export const STAGE_SHORT: Record<Stage, string> = {
  lead: 'Piste',
  contacted: 'Contacté',
  applied: 'Envoyée',
  interview: 'Entretien',
  negotiation: 'Négo.',
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
 * Formate une valeur monétaire de maniere compacte (ex. 1 200 000 -> « 1,2 M »,
 * 45000 -> « 45 k »). Renvoie « 0 » pour les valeurs nulles. Sans symbole de
 * devise : l'appelant ajoute « XOF » s'il le souhaite.
 */
export function formatCompactValue(value: number): string {
  if (!value) return '0'
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return `${m.toFixed(m >= 10 ? 0 : 1).replace('.', ',')} M`
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)} k`
  }
  return formatNumber(value)
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
