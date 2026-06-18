import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import {
  OPPORTUNITY_VIEWS,
  type OpportunityView,
} from '~/components/opportunities/view-switcher'
import { OpportunityWorkspace } from '~/components/opportunities/workspace'

type OpportunitesSearch = {
  view: OpportunityView
  id?: string
}

export const Route = createFileRoute('/app/opportunites')({
  // Vue + sélection portées par l'URL (deep-link, partageable). `view` par
  // défaut « liste » ; `id` optionnel ouvre le panneau split.
  validateSearch: (search: Record<string, unknown>): OpportunitesSearch => {
    const rawView = search.view
    const view = OPPORTUNITY_VIEWS.includes(rawView as OpportunityView)
      ? (rawView as OpportunityView)
      : 'liste'
    const id = typeof search.id === 'string' && search.id ? search.id : undefined
    return id ? { view, id } : { view }
  },
  component: OpportunitesPage,
  head: () => ({ meta: [{ title: m.opp_page_title() }] }),
})

function OpportunitesPage() {
  const { view, id } = Route.useSearch()
  const navigate = useNavigate()

  function setView(next: OpportunityView) {
    // Conserve la sélection courante au changement de vue.
    void navigate({
      to: '/app/opportunites',
      search: (prev) => {
        const out: OpportunitesSearch = { view: next }
        if (prev.id) out.id = prev.id
        return out
      },
      replace: true,
    })
  }

  function select(opportunityId: Id<'opportunities'>) {
    void navigate({
      to: '/app/opportunites',
      search: (prev) => ({ view: prev.view ?? 'liste', id: opportunityId }),
    })
  }

  function close() {
    void navigate({
      to: '/app/opportunites',
      search: (prev) => ({ view: prev.view ?? 'liste' }),
      replace: true,
    })
  }

  return (
    <OpportunityWorkspace
      view={view}
      selectedId={(id as Id<'opportunities'>) ?? null}
      onViewChange={setView}
      onSelect={select}
      onClose={close}
    />
  )
}
