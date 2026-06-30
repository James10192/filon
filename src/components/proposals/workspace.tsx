import { useState } from 'react'
import { Plus } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { useMediaQuery } from '~/lib/use-media-query'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '~/components/ui/sheet'
import { PageToolbar } from '~/components/app/page-toolbar'
import { ViewSwitcher, type ProposalView } from './view-switcher'
import { ListView, EMPTY_FILTERS, type ListFilters } from './views/list-view'
import { BoardView } from './views/board-view'
import { ProposalDetailPane } from './detail/detail-pane'
import { PaneErrorBoundary } from './detail/pane-error-boundary'
import { ProposalFormDialog } from './proposal-form-dialog'
import { useLensSet } from '~/components/opportunities/use-stage-labels'
import { proposalKindActionLabel } from './proposal-kind'

/**
 * Espace de travail Propositions unifié. Un sélecteur de vue (Liste / Tableau)
 * au-dessus, une zone de contenu, et un panneau de détail split à droite sur
 * desktop (feuille plein écran sur mobile).
 *
 * La vue et la sélection sont pilotées par l'URL (search params), via les
 * callbacks `onViewChange` / `onSelect` / `onClose` fournis par la route.
 */
export function ProposalWorkspace({
  view,
  selectedId,
  onViewChange,
  onSelect,
  onClose,
}: {
  view: ProposalView
  selectedId: Id<'proposals'> | null
  onViewChange: (view: ProposalView) => void
  onSelect: (id: Id<'proposals'>) => void
  onClose: () => void
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const lensSet = useLensSet()
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS)

  // Titre + CTA persona-aware : en vente, une proposition est un « devis / offre ».
  // Defaut (emploi/recrutement) : texte historique inchange.
  const pageTitle =
    lensSet === 'vente' ? m.prop_page_title_vente() : m.prop_page_title()
  const newLabel =
    lensSet === 'vente'
      ? proposalKindActionLabel('proposal')
      : m.prop_new()

  // Formulaire création / édition, partagé par les deux vues.
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Doc<'proposals'> | null>(null)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(proposal: Doc<'proposals'>) {
    setEditing(proposal)
    setDialogOpen(true)
  }

  const paneOpen = selectedId !== null
  const showSidePane = isDesktop && paneOpen

  const content = (
    <>
      {view === 'liste' && (
        <ListView
          filters={filters}
          onFiltersChange={setFilters}
          onSelect={onSelect}
          selectedId={selectedId}
          onCreate={openCreate}
          onEdit={openEdit}
        />
      )}
      {view === 'tableau' && (
        <BoardView
          onSelect={onSelect}
          selectedId={selectedId}
          onCreate={openCreate}
        />
      )}
    </>
  )

  return (
    <div className="flex flex-col">
      <PageToolbar
        title={pageTitle}
        subtitle={m.prop_page_subtitle()}
        actions={
          <>
            <ViewSwitcher value={view} onChange={onViewChange} />
            <Button onClick={openCreate} className="shrink-0">
              <Plus className="size-4" />
              <span className="hidden sm:inline">{newLabel}</span>
            </Button>
          </>
        }
      />

      <div className="flex gap-5">
        <div
          className={cn(
            'min-w-0 flex-1',
            showSidePane && 'lg:max-w-[calc(100%-30rem)]',
          )}
        >
          {content}
        </div>

        {showSidePane && selectedId && (
          <aside className="sticky top-0 hidden h-[calc(100dvh-7.5rem)] w-[29rem] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg shadow-[var(--shadow-card)] lg:block">
            <PaneErrorBoundary resetKey={selectedId} onClose={onClose}>
              <ProposalDetailPane proposalId={selectedId} onClose={onClose} />
            </PaneErrorBoundary>
          </aside>
        )}
      </div>

      {/* Mobile / tablette : feuille plein écran. */}
      <Sheet
        open={!isDesktop && paneOpen}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-full gap-0 p-0 sm:max-w-xl"
        >
          <SheetTitle className="sr-only">{m.prop_sheet_title()}</SheetTitle>
          <SheetDescription className="sr-only">
            {m.prop_sheet_description()}
          </SheetDescription>
          {selectedId && (
            <PaneErrorBoundary resetKey={selectedId} onClose={onClose}>
              <ProposalDetailPane
                proposalId={selectedId}
                onClose={onClose}
                showCloseButton={false}
              />
            </PaneErrorBoundary>
          )}
        </SheetContent>
      </Sheet>

      <ProposalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        proposal={editing}
      />
    </div>
  )
}
