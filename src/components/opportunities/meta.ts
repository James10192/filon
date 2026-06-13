import {
  Briefcase,
  Send,
  Radar,
  Rocket,
  type LucideIcon,
} from 'lucide-react'

/**
 * Référentiel partagé des opportunités (stages, types) + helpers de formatage.
 * Aligné sur docs/DESIGN.md et docs/COPY.md. Les classes utilisent les tokens
 * Tailwind v4 du thème (text-stage-*, etc.).
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

export type ActivityKind =
  | 'note'
  | 'email'
  | 'call'
  | 'interview'
  | 'status_change'
  | 'other'

export const STAGES: Stage[] = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
]

export const STAGE_META: Record<
  Stage,
  { label: string; short: string; dot: string; chip: string }
> = {
  lead: {
    label: 'Piste',
    short: 'Piste',
    dot: 'bg-stage-lead',
    chip: 'bg-stage-lead-soft text-stage-lead',
  },
  contacted: {
    label: 'Contacté',
    short: 'Contacté',
    dot: 'bg-stage-contacted',
    chip: 'bg-stage-contacted-soft text-stage-contacted',
  },
  applied: {
    label: 'Candidature envoyée',
    short: 'Envoyée',
    dot: 'bg-stage-applied',
    chip: 'bg-stage-applied-soft text-stage-applied',
  },
  interview: {
    label: 'Entretien',
    short: 'Entretien',
    dot: 'bg-stage-interview',
    chip: 'bg-stage-interview-soft text-stage-interview',
  },
  negotiation: {
    label: 'Négociation',
    short: 'Négo.',
    dot: 'bg-stage-negotiation',
    chip: 'bg-stage-negotiation-soft text-stage-negotiation',
  },
  won: {
    label: 'Gagné',
    short: 'Gagné',
    dot: 'bg-stage-won',
    chip: 'bg-stage-won-soft text-stage-won',
  },
  lost: {
    label: 'Perdu',
    short: 'Perdu',
    dot: 'bg-stage-lost',
    chip: 'bg-stage-lost-soft text-stage-lost',
  },
}

export const TYPE_META: Record<
  OppType,
  { label: string; long: string; icon: LucideIcon; fg: string }
> = {
  job_offer: {
    label: 'Candidature',
    long: 'Candidature à une offre',
    icon: Briefcase,
    fg: 'text-type-application',
  },
  spontaneous: {
    label: 'Proposition',
    long: 'Proposition spontanée',
    icon: Send,
    fg: 'text-type-pitch',
  },
  prospect: {
    label: 'Prospection',
    long: 'Prospection freelance',
    icon: Radar,
    fg: 'text-type-prospect',
  },
  mission: {
    label: 'Mission',
    long: 'Mission en cours',
    icon: Rocket,
    fg: 'text-type-mission',
  },
}

export const PRIORITY_META: Record<
  Priority,
  { label: string; chip: string }
> = {
  low: { label: 'Basse', chip: 'bg-surface-2 text-fg-muted' },
  medium: { label: 'Moyenne', chip: 'bg-info-soft text-info' },
  high: { label: 'Haute', chip: 'bg-warning-soft text-warning' },
}

export const ACTIVITY_META: Record<
  ActivityKind,
  { label: string }
> = {
  note: { label: 'Note' },
  email: { label: 'E-mail' },
  call: { label: 'Appel' },
  interview: { label: 'Entretien' },
  status_change: { label: "Changement d'étape" },
  other: { label: 'Autre' },
}

/** Date ISO -> libellé court FR (ex. « 13 juin 2026 »). */
export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Date courte (ex. « 13 juin »). */
export function formatDateShort(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/** Timestamp (ms) -> date + heure courtes FR. */
export function formatDateTime(ms: number): string {
  const date = new Date(ms)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Statut d'une échéance par rapport à aujourd'hui. */
export function dueStatus(
  iso?: string | null,
): 'none' | 'overdue' | 'today' | 'upcoming' {
  if (!iso) return 'none'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'none'
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000
  const time = date.getTime()
  if (time < startOfToday) return 'overdue'
  if (time < endOfToday) return 'today'
  return 'upcoming'
}
