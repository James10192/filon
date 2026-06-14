import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
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
import { useQuickCapture } from '~/components/app/quick-capture'
import { ViewSwitcher, type OpportunityView } from './view-switcher'
import { ListView, EMPTY_FILTERS, type ListFilters } from './views/list-view'
import { BoardView } from './views/board-view'
import { CalendarView } from './views/calendar-view'
import { OpportunityDetailPane } from './detail/detail-pane'
import { PaneErrorBoundary } from './detail/pane-error-boundary'

/**
 * Espace de travail Opportunités unifié. Un sélecteur de vue
 * (Liste / Tableau / Calendrier) au-dessus, une zone de contenu, et un panneau
 * de détail split à droite sur desktop (feuille plein écran sur mobile).
 *
 * La vue et la sélection sont pilotées par l'URL (search params), via les
 * callbacks `onViewChange` / `onSelect` / `onClose` fournis par la route.
 */
export function OpportunityWorkspace({
  view,
  selectedId,
  onViewChange,
  onSelect,
  onClose,
}: {
  view: OpportunityView
  selectedId: Id<'opportunities'> | null
  onViewChange: (view: OpportunityView) => void
  onSelect: (id: Id<'opportunities'>) => void
  onClose: () => void
}) {
  const quickCapture = useQuickCapture()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  // Filtres de la vue Liste conservés au niveau espace : stables au switch.
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS)

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
          onCreate={quickCapture.open}
        />
      )}
      {view === 'tableau' && (
        <BoardView onSelect={onSelect} onCreate={quickCapture.open} />
      )}
      {view === 'calendrier' && <CalendarView onSelect={onSelect} />}
    </>
  )

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Opportunités"
        subtitle="Toutes vos pistes, candidatures, propositions et missions."
        actions={
          <>
            <ViewSwitcher value={view} onChange={onViewChange} />
            <Button onClick={quickCapture.open}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </>
        }
      />

      <div className="flex gap-5">
        <div className={cn('min-w-0 flex-1', showSidePane && 'lg:max-w-[calc(100%-30rem)]')}>
          {content}
        </div>

        {showSidePane && selectedId && (
          <aside className="sticky top-0 hidden h-[calc(100dvh-7.5rem)] w-[29rem] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg shadow-[var(--shadow-card)] lg:block">
            <PaneErrorBoundary resetKey={selectedId} onClose={onClose}>
              <OpportunityDetailPane
                opportunityId={selectedId}
                onClose={onClose}
                onRemoved={onClose}
              />
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
          <SheetTitle className="sr-only">Détail de l'opportunité</SheetTitle>
          <SheetDescription className="sr-only">
            Détail, étape, activité et relances de l'opportunité sélectionnée.
          </SheetDescription>
          {selectedId && (
            <PaneErrorBoundary resetKey={selectedId} onClose={onClose}>
              <OpportunityDetailPane
                opportunityId={selectedId}
                onClose={onClose}
                onRemoved={onClose}
                showCloseButton={false}
              />
            </PaneErrorBoundary>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
