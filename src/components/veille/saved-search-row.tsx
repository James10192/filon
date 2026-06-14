import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/sonner'
import { DeleteConfirmDialog } from '~/components/companies/delete-confirm-dialog'
import { formatRelativeTime } from './meta'

/**
 * Ligne d'une recherche enregistrée : mots-clés, bascule actif/inactif,
 * dernière analyse et suppression (AlertDialog, jamais window.confirm).
 */
export function SavedSearchRow({ search }: { search: Doc<'savedSearches'> }) {
  const update = useMutation(api.savedSearches.update)
  const remove = useMutation(api.savedSearches.remove)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

  async function toggleEnabled() {
    setToggling(true)
    try {
      await update({ id: search._id, enabled: !search.enabled })
    } catch {
      toast.error('La mise à jour a échoué.')
    } finally {
      setToggling(false)
    }
  }

  async function confirmRemove() {
    try {
      await remove({ id: search._id })
      toast.success('Recherche supprimée.')
    } catch {
      toast.error('La suppression a échoué.')
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {search.keywords.map((kw) => (
            <Badge key={kw} variant="accent">
              {kw}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-fg-subtle">
          {search.lastRunAt ? (
            <>
              Dernière analyse{' '}
              <span className="assay-meta text-fg-subtle">
                {formatRelativeTime(search.lastRunAt)}
              </span>{' '}
              ·{' '}
              <span className="assay-meta text-fg-subtle">
                {search.lastMatchCount ?? 0}
              </span>{' '}
              offre(s) trouvée(s)
            </>
          ) : (
            'Aucune analyse pour le moment'
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleEnabled}
          disabled={toggling}
          aria-pressed={search.enabled}
          className="h-11"
        >
          <span
            className={
              search.enabled
                ? 'size-2 rounded-full bg-success'
                : 'size-2 rounded-full bg-fg-subtle'
            }
            aria-hidden
          />
          {search.enabled ? 'Active' : 'En pause'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteOpen(true)}
          aria-label="Supprimer la recherche"
          className="h-11 w-11 text-fg-subtle hover:text-danger"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer cette recherche ?"
        description="Le moniteur cessera de surveiller ces mots-clés. Les offres déjà importées sont conservées."
        onConfirm={confirmRemove}
      />
    </div>
  )
}
