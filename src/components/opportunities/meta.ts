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

/** Nature de la cible suivie par une opportunite. */
export type TargetType = 'company' | 'person' | 'none'

/** Canal d'origine normalise d'une opportunite (distinct de la source libre). */
export type SourceChannel =
  | 'job_board'
  | 'referral'
  | 'event'
  | 'networking'
  | 'salon'
  | 'social'
  | 'inbound'
  | 'cold'
  | 'other'

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

/**
 * Libelles FR de la cible (entreprise / particulier / aucune). `order` fixe
 * l'ordre d'affichage du selecteur de cible.
 */
export const TARGET_TYPE_META: Record<
  TargetType,
  { label: string; hint: string; order: number }
> = {
  company: {
    label: 'Entreprise',
    hint: 'Un employeur ou un client potentiel',
    order: 0,
  },
  person: {
    label: 'Particulier',
    hint: 'Une personne suivie directement (prospect, parrainage)',
    order: 1,
  },
  none: {
    label: 'Aucune',
    hint: 'Pas de cible rattachée pour l’instant',
    order: 2,
  },
}

export const TARGET_TYPES: TargetType[] = (
  Object.entries(TARGET_TYPE_META) as [TargetType, { order: number }][]
)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key)

/**
 * Libelles FR du canal d'origine (`sourceChannel`). Sert le select de source du
 * formulaire et l'affichage. `order` fixe l'ordre du select.
 */
export const SOURCE_META: Record<
  SourceChannel,
  { label: string; order: number }
> = {
  job_board: { label: 'En ligne / Job board', order: 0 },
  referral: { label: 'Recommandation', order: 1 },
  event: { label: 'Événement', order: 2 },
  networking: { label: 'Networking', order: 3 },
  salon: { label: 'Salon', order: 4 },
  social: { label: 'Réseaux sociaux', order: 5 },
  inbound: { label: 'Entrant', order: 6 },
  cold: { label: 'Démarchage à froid', order: 7 },
  other: { label: 'Autre', order: 8 },
}

export const SOURCE_CHANNELS: SourceChannel[] = (
  Object.entries(SOURCE_META) as [SourceChannel, { order: number }][]
)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key)

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
