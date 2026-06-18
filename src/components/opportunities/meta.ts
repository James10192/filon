import {
  Briefcase,
  Send,
  Radar,
  Rocket,
  type LucideIcon,
} from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

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
  { readonly label: string; readonly short: string; dot: string; chip: string }
> = {
  lead: {
    get label() {
      return m.opp_stage_lead()
    },
    get short() {
      return m.opp_stage_lead_short()
    },
    dot: 'bg-stage-lead',
    chip: 'bg-stage-lead-soft text-stage-lead',
  },
  contacted: {
    get label() {
      return m.opp_stage_contacted()
    },
    get short() {
      return m.opp_stage_contacted_short()
    },
    dot: 'bg-stage-contacted',
    chip: 'bg-stage-contacted-soft text-stage-contacted',
  },
  applied: {
    get label() {
      return m.opp_stage_applied()
    },
    get short() {
      return m.opp_stage_applied_short()
    },
    dot: 'bg-stage-applied',
    chip: 'bg-stage-applied-soft text-stage-applied',
  },
  interview: {
    get label() {
      return m.opp_stage_interview()
    },
    get short() {
      return m.opp_stage_interview_short()
    },
    dot: 'bg-stage-interview',
    chip: 'bg-stage-interview-soft text-stage-interview',
  },
  negotiation: {
    get label() {
      return m.opp_stage_negotiation()
    },
    get short() {
      return m.opp_stage_negotiation_short()
    },
    dot: 'bg-stage-negotiation',
    chip: 'bg-stage-negotiation-soft text-stage-negotiation',
  },
  won: {
    get label() {
      return m.opp_stage_won()
    },
    get short() {
      return m.opp_stage_won_short()
    },
    dot: 'bg-stage-won',
    chip: 'bg-stage-won-soft text-stage-won',
  },
  lost: {
    get label() {
      return m.opp_stage_lost()
    },
    get short() {
      return m.opp_stage_lost_short()
    },
    dot: 'bg-stage-lost',
    chip: 'bg-stage-lost-soft text-stage-lost',
  },
}

export const TYPE_META: Record<
  OppType,
  { readonly label: string; readonly long: string; icon: LucideIcon; fg: string }
> = {
  job_offer: {
    get label() {
      return m.opp_type_job_offer()
    },
    get long() {
      return m.opp_type_job_offer_long()
    },
    icon: Briefcase,
    fg: 'text-type-application',
  },
  spontaneous: {
    get label() {
      return m.opp_type_spontaneous()
    },
    get long() {
      return m.opp_type_spontaneous_long()
    },
    icon: Send,
    fg: 'text-type-pitch',
  },
  prospect: {
    get label() {
      return m.opp_type_prospect()
    },
    get long() {
      return m.opp_type_prospect_long()
    },
    icon: Radar,
    fg: 'text-type-prospect',
  },
  mission: {
    get label() {
      return m.opp_type_mission()
    },
    get long() {
      return m.opp_type_mission_long()
    },
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
  { readonly label: string; readonly hint: string; order: number }
> = {
  company: {
    get label() {
      return m.opp_target_company()
    },
    get hint() {
      return m.opp_target_company_hint()
    },
    order: 0,
  },
  person: {
    get label() {
      return m.opp_target_person()
    },
    get hint() {
      return m.opp_target_person_hint()
    },
    order: 1,
  },
  none: {
    get label() {
      return m.opp_target_none()
    },
    get hint() {
      return m.opp_target_none_hint()
    },
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
  { readonly label: string; order: number }
> = {
  job_board: {
    get label() {
      return m.opp_source_job_board()
    },
    order: 0,
  },
  referral: {
    get label() {
      return m.opp_source_referral()
    },
    order: 1,
  },
  event: {
    get label() {
      return m.opp_source_event()
    },
    order: 2,
  },
  networking: {
    get label() {
      return m.opp_source_networking()
    },
    order: 3,
  },
  salon: {
    get label() {
      return m.opp_source_salon()
    },
    order: 4,
  },
  social: {
    get label() {
      return m.opp_source_social()
    },
    order: 5,
  },
  inbound: {
    get label() {
      return m.opp_source_inbound()
    },
    order: 6,
  },
  cold: {
    get label() {
      return m.opp_source_cold()
    },
    order: 7,
  },
  other: {
    get label() {
      return m.opp_source_other()
    },
    order: 8,
  },
}

export const SOURCE_CHANNELS: SourceChannel[] = (
  Object.entries(SOURCE_META) as [SourceChannel, { order: number }][]
)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key)

export const PRIORITY_META: Record<
  Priority,
  { readonly label: string; chip: string }
> = {
  low: {
    get label() {
      return m.opp_priority_low()
    },
    chip: 'bg-surface-2 text-fg-muted',
  },
  medium: {
    get label() {
      return m.opp_priority_medium()
    },
    chip: 'bg-info-soft text-info',
  },
  high: {
    get label() {
      return m.opp_priority_high()
    },
    chip: 'bg-warning-soft text-warning',
  },
}

export const ACTIVITY_META: Record<
  ActivityKind,
  { readonly label: string }
> = {
  note: {
    get label() {
      return m.opp_activity_note()
    },
  },
  email: {
    get label() {
      return m.opp_activity_email()
    },
  },
  call: {
    get label() {
      return m.opp_activity_call()
    },
  },
  interview: {
    get label() {
      return m.opp_activity_interview()
    },
  },
  status_change: {
    get label() {
      return m.opp_activity_status_change()
    },
  },
  other: {
    get label() {
      return m.opp_activity_other()
    },
  },
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
