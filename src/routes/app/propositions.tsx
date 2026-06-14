import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  PROPOSAL_VIEWS,
  type ProposalView,
} from '~/components/proposals/view-switcher'
import { ProposalWorkspace } from '~/components/proposals/workspace'
import { ProposalFormDialog } from '~/components/proposals/proposal-form-dialog'

type PropositionsSearch = {
  view: ProposalView
  id?: string
  nouveau?: boolean
}

export const Route = createFileRoute('/app/propositions')({
  // Vue + sélection portées par l'URL (deep-link, partageable). `view` par
  // défaut « liste » ; `id` optionnel ouvre le panneau split ; `nouveau` ouvre
  // directement le formulaire (palette de commandes).
  validateSearch: (search: Record<string, unknown>): PropositionsSearch => {
    const rawView = search.view
    const view = PROPOSAL_VIEWS.includes(rawView as ProposalView)
      ? (rawView as ProposalView)
      : 'liste'
    const out: PropositionsSearch = { view }
    if (typeof search.id === 'string' && search.id) out.id = search.id
    if (search.nouveau) out.nouveau = true
    return out
  },
  component: PropositionsPage,
  head: () => ({ meta: [{ title: 'Filon · Propositions' }] }),
})

/** Restreint la vue (union router globale) à une vue Propositions valide. */
function narrowView(v: unknown): ProposalView {
  return PROPOSAL_VIEWS.includes(v as ProposalView) ? (v as ProposalView) : 'liste'
}

function PropositionsPage() {
  const { view, id, nouveau } = Route.useSearch()
  const navigate = useNavigate()

  // Auto-ouverture du formulaire via la palette (?nouveau), nettoyée ensuite.
  const [createOpen, setCreateOpen] = useState(false)
  useEffect(() => {
    if (!nouveau) return
    setCreateOpen(true)
    void navigate({
      to: '/app/propositions',
      search: (prev) => ({ view: narrowView(prev.view) }),
      replace: true,
    })
  }, [nouveau, navigate])

  function setView(next: ProposalView) {
    void navigate({
      to: '/app/propositions',
      search: (prev) => {
        const out: PropositionsSearch = { view: next }
        if (prev.id) out.id = prev.id as string
        return out
      },
      replace: true,
    })
  }

  function select(proposalId: Id<'proposals'>) {
    void navigate({
      to: '/app/propositions',
      search: (prev) => ({ view: narrowView(prev.view), id: proposalId }),
    })
  }

  function close() {
    void navigate({
      to: '/app/propositions',
      search: (prev) => ({ view: narrowView(prev.view) }),
      replace: true,
    })
  }

  return (
    <>
      <ProposalWorkspace
        view={view}
        selectedId={(id as Id<'proposals'>) ?? null}
        onViewChange={setView}
        onSelect={select}
        onClose={close}
      />
      {/* Formulaire ouvert via la palette (?nouveau). */}
      <ProposalFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        proposal={null}
      />
    </>
  )
}
