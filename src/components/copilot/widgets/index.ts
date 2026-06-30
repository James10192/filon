import { createElement, type ReactNode } from 'react'
import type { CopilotOpp } from '../copilot-opp-card'
import { PipelineSummary, type PipelineData } from './pipeline-stats'
import { ListOpportunities, OpportunitiesNeedingAction } from './opportunities'
import { DueFollowups, type FollowupItem } from './due-followups'
import { ListProposals, type ProposalItem } from './list-proposals'
import { ProposalDetail, type ProposalDetailData } from './proposal-detail'
import {
  FindCompany,
  FindContact,
  type CompanyItem,
  type ContactItem,
} from './carnet'
import { TeamOverview, type TeamOverviewData } from './team-overview'
import { NetworkStatus, type NetworkStatusData } from './network-status'
import { ReferralOverview, type ReferralOverviewData } from './referral-overview'
import { VeilleDigest, type VeilleDigestData } from './veille-digest'

/**
 * Registre des widgets « generative UI » du copilote : à chaque nom d'outil
 * correspond un rendu riche typé sur la sortie de l'outil. `renderToolResult`
 * résout le widget et renvoie `null` si l'outil n'a pas de rendu dédié (fallback
 * générique géré par l'appelant). Aucune UI générée par le LLM : les widgets sont
 * figés et typés côté front.
 *
 * `ctx.onNavigate` (optionnel) ferme le tiroir copilote quand l'utilisateur ouvre
 * une fiche depuis une carte (no-op sur la route plein écran).
 */

export type WidgetCtx = { onNavigate?: () => void }

type Widget = (output: unknown, ctx: WidgetCtx) => ReactNode

const opps = (output: unknown) => (output ?? []) as CopilotOpp[]

export const WIDGETS: Record<string, Widget> = {
  summarize_pipeline: (output) =>
    createElement(PipelineSummary, { data: output as PipelineData }),
  pipeline_stats: (output) =>
    createElement(PipelineSummary, { data: output as PipelineData }),

  list_opportunities: (output, ctx) =>
    createElement(ListOpportunities, { items: opps(output), onNavigate: ctx.onNavigate }),
  search_opportunities: (output, ctx) =>
    createElement(ListOpportunities, { items: opps(output), onNavigate: ctx.onNavigate }),
  opportunities_needing_action: (output, ctx) =>
    createElement(OpportunitiesNeedingAction, {
      items: opps(output),
      onNavigate: ctx.onNavigate,
    }),

  due_followups: (output) =>
    createElement(DueFollowups, { items: (output ?? []) as FollowupItem[] }),
  list_proposals: (output) =>
    createElement(ListProposals, { items: (output ?? []) as ProposalItem[] }),
  get_proposal_detail: (output) =>
    createElement(ProposalDetail, { proposal: output as ProposalDetailData }),
  find_company: (output) =>
    createElement(FindCompany, { items: (output ?? []) as CompanyItem[] }),
  find_contact: (output) =>
    createElement(FindContact, { items: (output ?? []) as ContactItem[] }),

  team_overview: (output) =>
    createElement(TeamOverview, { data: output as TeamOverviewData }),
  network_status: (output) =>
    createElement(NetworkStatus, { data: output as NetworkStatusData }),
  referral_overview: (output) =>
    createElement(ReferralOverview, { data: output as ReferralOverviewData }),
  veille_digest: (output) =>
    createElement(VeilleDigest, { data: output as VeilleDigestData }),
}

/**
 * Rendu riche du résultat d'un outil. Signature inchangée pour l'appelant
 * (`copilot-message.tsx`). `null` si l'outil n'a pas de widget dédié.
 */
export function renderToolResult(
  tool: string,
  output: unknown,
  onNavigate?: () => void,
): ReactNode {
  if (output == null || typeof output !== 'object') return null
  return WIDGETS[tool]?.(output, { onNavigate }) ?? null
}
