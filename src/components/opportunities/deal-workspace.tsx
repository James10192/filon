import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Id } from '../../../convex/_generated/dataModel'
import { DealInsightsStrip } from './deal-insights-strip'
import { OpportunityWorkspace } from './workspace'

/**
 * Deals reprend le moteur visuel et interactif du Pipeline historique.
 * La vue reste volontairement fixée sur le tableau, tandis que le clic ouvre
 * le même détail riche sur desktop et dans une Sheet sur mobile.
 */
export function DealWorkspace() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<Id<'opportunities'> | null>(null)

  return (
    <OpportunityWorkspace
      view="tableau"
      selectedId={selectedId}
      onViewChange={(view) => {
        void navigate({ to: '/app/opportunites', search: { view } })
      }}
      onSelect={setSelectedId}
      onClose={() => setSelectedId(null)}
      title="Deals"
      subtitle="Pilotez chaque opportunité, de la prospection au closing."
      showViewSwitcher={false}
      headerAddon={<DealInsightsStrip />}
    />
  )
}
