import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Plus, Radar } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { SavedSearchRow } from './saved-search-row'
import { VeilleEditDialog } from './veille-edit-dialog'
import { m } from '~/lib/paraglide/messages'

/**
 * Liste des veilles en cartes riches. États gérés : chargement (skeletons),
 * vide (état illustré + CTA), liste. La création et l'édition passent par le
 * VeilleEditDialog (formulaire complet), pas par une saisie inline.
 */
export function SavedSearchManager() {
  const searches = useQuery(api.savedSearches.list, {})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Doc<'savedSearches'> | undefined>()

  function openCreate() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function openEdit(search: Doc<'savedSearches'>) {
    setEditing(search)
    setDialogOpen(true)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.01em] text-fg">
            {m.veille_searches_title()}
          </h2>
          <p className="mt-0.5 text-sm text-fg-muted">
            {m.veille_searches_subtitle()}
          </p>
        </div>
        {searches && searches.length > 0 && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="size-4" />
            {m.veille_new_search()}
          </Button>
        )}
      </div>

      <SearchList
        searches={searches}
        onCreate={openCreate}
        onEdit={openEdit}
      />

      <VeilleEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        search={editing}
      />
    </section>
  )
}

function SearchList({
  searches,
  onCreate,
  onEdit,
}: {
  searches: ReturnType<typeof useQuery<typeof api.savedSearches.list>>
  onCreate: () => void
  onEdit: (search: Doc<'savedSearches'>) => void
}) {
  if (searches === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-6 w-24 rounded-[var(--radius-sm)]" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-6 w-20 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-6 w-24 rounded-[var(--radius-sm)]" />
            </div>
            <Skeleton className="mt-3 h-3 w-56" />
          </div>
        ))}
      </div>
    )
  }

  if (searches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Radar className="size-7" />
        </span>
        <div className="max-w-sm space-y-1.5">
          <h3 className="text-base font-semibold text-fg">
            {m.veille_searches_empty_title()}
          </h3>
          <p className="text-sm leading-relaxed text-fg-muted">
            {m.veille_searches_empty_body()}
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="size-4" />
          {m.veille_create_first()}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {searches.map((search) => (
        <SavedSearchRow
          key={search._id}
          search={search}
          onEdit={() => onEdit(search)}
        />
      ))}
    </div>
  )
}
