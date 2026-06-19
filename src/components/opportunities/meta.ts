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

/**
 * Jeu d'etiquettes de pipeline a afficher (persona-aware). Ne change PAS les
 * cles internes du pipeline : seuls les libelles affiches varient.
 *  - 'emploi'      : recherche d'emploi (defaut, etudiant)
 *  - 'vente'       : prospection commerciale (freelance, consultant, agent...)
 *  - 'recrutement' : sourcing candidats (recruteur)
 */
export type StageLabelSet = 'emploi' | 'vente' | 'recrutement'

/** Resolveurs de libelle par jeu d'etiquettes, indexes par stage. */
const STAGE_LABEL_RESOLVERS: Record<
  StageLabelSet,
  Record<Stage, () => string>
> = {
  emploi: {
    lead: m.opp_stage_lead,
    contacted: m.opp_stage_contacted,
    applied: m.opp_stage_applied,
    interview: m.opp_stage_interview,
    negotiation: m.opp_stage_negotiation,
    won: m.opp_stage_won,
    lost: m.opp_stage_lost,
  },
  vente: {
    lead: m.opp_stage_lead_vente,
    contacted: m.opp_stage_contacted_vente,
    applied: m.opp_stage_applied_vente,
    interview: m.opp_stage_interview_vente,
    negotiation: m.opp_stage_negotiation_vente,
    won: m.opp_stage_won_vente,
    lost: m.opp_stage_lost_vente,
  },
  recrutement: {
    lead: m.opp_stage_lead_recrutement,
    contacted: m.opp_stage_contacted_recrutement,
    applied: m.opp_stage_applied_recrutement,
    interview: m.opp_stage_interview_recrutement,
    negotiation: m.opp_stage_negotiation_recrutement,
    won: m.opp_stage_won_recrutement,
    lost: m.opp_stage_lost_recrutement,
  },
}

/**
 * Libelle affiche d'un stage selon le jeu d'etiquettes du persona. Les couleurs
 * et points (`dot`/`chip`) restent fournis par `STAGE_META`. Defaut 'emploi'.
 */
export function stageLabel(
  stage: Stage,
  set: StageLabelSet = 'emploi',
): string {
  return STAGE_LABEL_RESOLVERS[set][stage]()
}

/**
 * Surcharges de libelle de TYPE par jeu d'etiquettes. On ne declare QUE les
 * couples (set, type) dont le libelle DIFFERE du defaut 'emploi' (par gout :
 * eviter de dupliquer les libelles identiques). Le fallback est le getter
 * `TYPE_META[type].label`. Voir `typeLabel`.
 */
const TYPE_LABEL_OVERRIDES: Partial<
  Record<StageLabelSet, Partial<Record<OppType, () => string>>>
> = {
  vente: {
    job_offer: () => m.opp_type_job_offer_vente(),
    spontaneous: () => m.opp_type_spontaneous_vente(),
  },
  recrutement: {
    job_offer: () => m.opp_type_job_offer_recrutement(),
    prospect: () => m.opp_type_prospect_recrutement(),
  },
}

/**
 * Libelle affiche d'un type d'opportunite selon le jeu d'etiquettes du persona.
 * Defaut 'emploi' = libelle historique (`TYPE_META[type].label`). Les icones et
 * couleurs (`icon`/`fg`) restent fournies par `TYPE_META`.
 */
export function typeLabel(type: OppType, set: StageLabelSet = 'emploi'): string {
  return TYPE_LABEL_OVERRIDES[set]?.[type]?.() ?? TYPE_META[type].label
}

/** Champs de detail persona-aware (libelle adapte au jeu d'etiquettes). */
export type LensField = 'compensation' | 'location' | 'deadline'

/**
 * Resolveurs de libelle de CHAMP par jeu d'etiquettes. 'emploi' reutilise les
 * cles existantes (texte FR/EN inchange). Seuls 'vente'/'recrutement' ajoutent
 * des variantes la ou le vocabulaire differe genuinement.
 */
const FIELD_LABEL_RESOLVERS: Record<
  StageLabelSet,
  Record<LensField, () => string>
> = {
  emploi: {
    compensation: m.opp_form_compensation_label,
    location: m.opp_form_location_label,
    deadline: m.opp_form_deadline_label,
  },
  vente: {
    compensation: m.opp_field_compensation_vente,
    location: m.opp_field_location_vente,
    deadline: m.opp_form_deadline_label,
  },
  recrutement: {
    compensation: m.opp_field_compensation_recrutement,
    location: m.opp_form_location_label,
    deadline: m.opp_form_deadline_label,
  },
}

/**
 * Libelle affiche d'un champ de detail selon le persona. Defaut 'emploi' =
 * libelles historiques. Ne touche QUE compensation/location/deadline.
 */
export function fieldLabel(
  field: LensField,
  set: StageLabelSet = 'emploi',
): string {
  return FIELD_LABEL_RESOLVERS[set][field]()
}

/**
 * Libelle de l'entite « proposition » selon le persona. En vente, une
 * proposition est un « devis / offre ». Defaut 'emploi'/'recrutement' =
 * « Proposition ». Utilise par l'espace Propositions.
 */
export function propositionLabel(set: StageLabelSet = 'emploi'): string {
  return set === 'vente' ? m.prop_entity_vente() : m.prop_entity_default()
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
