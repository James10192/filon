import type { Id } from '../../../convex/_generated/dataModel'
import type { OppType, Priority, Stage } from './pipeline-meta'

/**
 * Forme d'une opportunité telle que renvoyée par `api.opportunities.board`
 * (cf. docs/API-CONTRACT.md). Typage local côté pipeline : on ne dépend pas
 * d'un autre domaine, seulement du contrat.
 */
export type Opportunity = {
  _id: Id<'opportunities'>
  _creationTime: number
  userId: string
  title: string
  type: OppType
  companyId?: Id<'companies'>
  contactId?: Id<'contacts'>
  source?: string
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
}

export type Board = Record<Stage, Opportunity[]>
