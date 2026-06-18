import type { Id } from '../../../convex/_generated/dataModel'
import type { OppType, Priority, Stage } from './pipeline-meta'

/**
 * Forme d'une opportunité telle que renvoyée par `api.opportunities.board`
 * (cf. docs/API-CONTRACT.md). Typage local côté pipeline : on ne dépend pas
 * d'un autre domaine, seulement du contrat.
 */
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

export type TargetType = 'company' | 'person' | 'none'

export type Opportunity = {
  _id: Id<'opportunities'>
  _creationTime: number
  userId: string
  title: string
  type: OppType
  companyId?: Id<'companies'>
  contactId?: Id<'contacts'>
  targetType?: TargetType
  source?: string
  sourceChannel?: SourceChannel
  sourceDetail?: string
  url?: string
  location?: string
  compensation?: string
  stage: Stage
  priority: Priority
  deadline?: string
  appliedAt?: string
  nextActionAt?: string
  tags: string[]
  description?: string
  order: number
  createdAt: number
  updatedAt: number
  // Champs enrichis renvoyés par `api.opportunities.board` (cf. contrat).
  companyName?: string
  contactName?: string
  effectiveTargetType?: TargetType
}

export type Board = Record<Stage, Opportunity[]>
