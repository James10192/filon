import { AlertTriangle } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import type { CopilotOpp } from '../copilot-opp-card'
import { OppList } from './primitives'

/**
 * Widgets « liste d'opportunités » : listing/recherche standard, et opportunités
 * sans prochaine action (à relancer). Tous deux rendent des cartes d'opportunité
 * navigables via la primitive partagée `OppList`.
 */

export function ListOpportunities({
  items,
  onNavigate,
}: {
  items: CopilotOpp[]
  onNavigate?: () => void
}) {
  return (
    <OppList
      items={items}
      onNavigate={onNavigate}
      label={(n) =>
        n > 1 ? m.app_tool_opps_plural({ n }) : m.app_tool_opps_singular({ n })
      }
      empty={m.app_tool_no_opps()}
    />
  )
}

export function OpportunitiesNeedingAction({
  items,
  onNavigate,
}: {
  items: CopilotOpp[]
  onNavigate?: () => void
}) {
  return (
    <OppList
      items={items}
      onNavigate={onNavigate}
      icon={AlertTriangle}
      label={(n) =>
        n > 1
          ? m.app_tool_opps_to_followup_plural({ n })
          : m.app_tool_opps_to_followup_singular({ n })
      }
      empty={m.app_tool_nothing_to_followup()}
    />
  )
}
