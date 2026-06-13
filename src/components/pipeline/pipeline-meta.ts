import {
  Briefcase,
  Rocket,
  Radar,
  Send,
  type LucideIcon,
} from 'lucide-react'

/**
 * Métadonnées partagées du pipeline (stages + types d'opportunité).
 * Source de vérité visuelle alignée sur docs/COPY.md et docs/DESIGN.md.
 * Code en anglais, libellés en français.
 */

export type Stage =
  | 'lead'
  | 'contacted'
  | 'applied'
  | 'interview'
  | 'negotiation'
  | 'won'
  | 'lost'

export type OppType = 'job_offer' | 'spontaneous' | 'prospect' | 'mission'

export type Priority = 'low' | 'medium' | 'high'

/** Ordre canonique des colonnes (piste vers perdu). */
export const STAGE_ORDER: Stage[] = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
]

type StageMeta = {
  label: string
  shortLabel: string
  /** Classe de texte/point (couleur de stage, cf. tokens DESIGN). */
  dotClass: string
  /** Classe de la chip de stage (fond doux + texte teinté). */
  chipClass: string
}

export const STAGE_META: Record<Stage, StageMeta> = {
  lead: {
    label: 'Piste',
    shortLabel: 'Piste',
    dotClass: 'bg-[var(--color-stage-lead)]',
    chipClass:
      'bg-[var(--color-stage-lead-soft)] text-[var(--color-stage-lead)]',
  },
  contacted: {
    label: 'Contacté',
    shortLabel: 'Contacté',
    dotClass: 'bg-[var(--color-stage-contacted)]',
    chipClass:
      'bg-[var(--color-stage-contacted-soft)] text-[var(--color-stage-contacted)]',
  },
  applied: {
    label: 'Candidature envoyée',
    shortLabel: 'Envoyée',
    dotClass: 'bg-[var(--color-stage-applied)]',
    chipClass:
      'bg-[var(--color-stage-applied-soft)] text-[var(--color-stage-applied)]',
  },
  interview: {
    label: 'Entretien',
    shortLabel: 'Entretien',
    dotClass: 'bg-[var(--color-stage-interview)]',
    chipClass:
      'bg-[var(--color-stage-interview-soft)] text-[var(--color-stage-interview)]',
  },
  negotiation: {
    label: 'Négociation',
    shortLabel: 'Négociation',
    dotClass: 'bg-[var(--color-stage-negotiation)]',
    chipClass:
      'bg-[var(--color-stage-negotiation-soft)] text-[var(--color-stage-negotiation)]',
  },
  won: {
    label: 'Gagné',
    shortLabel: 'Gagné',
    dotClass: 'bg-[var(--color-stage-won)]',
    chipClass: 'bg-[var(--color-stage-won-soft)] text-[var(--color-stage-won)]',
  },
  lost: {
    label: 'Perdu',
    shortLabel: 'Perdu',
    dotClass: 'bg-[var(--color-stage-lost)]',
    chipClass:
      'bg-[var(--color-stage-lost-soft)] text-[var(--color-stage-lost)]',
  },
}

type PriorityMeta = {
  label: string
  /** Classe de point (couleur sémantique, tokens existants). */
  dotClass: string
}

/**
 * Priorités d'une opportunité. `medium` reste neutre sur la carte (pas de
 * point) : seules `high` (warning) et `low` (subtile) portent un indicateur.
 */
export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  low: { label: 'Priorité basse', dotClass: 'bg-[var(--color-fg-subtle)]' },
  medium: { label: 'Priorité moyenne', dotClass: 'bg-[var(--color-info)]' },
  high: { label: 'Priorité haute', dotClass: 'bg-[var(--color-warning)]' },
}

type TypeMeta = {
  label: string
  icon: LucideIcon
  /** Classe de texte teinté du type (chip à contour). */
  fgClass: string
}

export const TYPE_META: Record<OppType, TypeMeta> = {
  job_offer: {
    label: 'Candidature',
    icon: Briefcase,
    fgClass: 'text-[var(--color-type-application)]',
  },
  spontaneous: {
    label: 'Proposition',
    icon: Send,
    fgClass: 'text-[var(--color-type-pitch)]',
  },
  prospect: {
    label: 'Prospection',
    icon: Radar,
    fgClass: 'text-[var(--color-type-prospect)]',
  },
  mission: {
    label: 'Mission',
    icon: Rocket,
    fgClass: 'text-[var(--color-type-mission)]',
  },
}

/**
 * `compensation` est une chaîne libre (ex: « 800k XOF/mois », « 45 000 € »).
 * Pour la somme du CA potentiel par colonne, on extrait la première valeur
 * numérique et on interprète un suffixe « k »/« m » courant. Best-effort :
 * sert d'indicateur, pas de comptabilité.
 */
export function parseCompensation(value?: string): number {
  if (!value) return 0
  const match = value
    .replace(/ | /g, ' ')
    .match(/(\d[\d\s.,]*)\s*([kKmM])?/)
  if (!match) return 0
  const raw = match[1]!.replace(/[\s.](?=\d{3}\b)/g, '').replace(',', '.')
  let amount = Number.parseFloat(raw)
  if (!Number.isFinite(amount)) return 0
  const suffix = match[2]?.toLowerCase()
  if (suffix === 'k') amount *= 1_000
  else if (suffix === 'm') amount *= 1_000_000
  return amount
}

/** Format compact d'un total de CA (pas de devise figée : indicatif). */
export function formatPotential(total: number): string {
  if (total <= 0) return ''
  if (total >= 1_000_000) {
    const m = total / 1_000_000
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} M`
  }
  if (total >= 1_000) {
    const k = total / 1_000
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)} k`
  }
  return new Intl.NumberFormat('fr-FR').format(Math.round(total))
}

/** Sémantique de la pastille de relance selon l'échéance (ISO string). */
export function followupTone(
  nextActionAt?: string,
): 'overdue' | 'today' | 'upcoming' | null {
  if (!nextActionAt) return null
  const due = new Date(nextActionAt)
  if (Number.isNaN(due.getTime())) return null
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000
  const t = due.getTime()
  if (t < startOfToday) return 'overdue'
  if (t < startOfTomorrow) return 'today'
  return 'upcoming'
}

export function formatShortDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(d)
}
