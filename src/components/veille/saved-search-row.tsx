import { useState } from 'react'
import { useMutation } from 'convex/react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { CONNECTOR_META } from '../../../convex/veille/connectors'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Switch } from '~/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { toast } from '~/components/ui/sonner'
import { DeleteConfirmDialog } from '~/components/companies/delete-confirm-dialog'
import { INTENT_LABELS, formatRelativeTime, type VeilleIntent } from './meta'

/** Libellés des sources ciblées, ou « Toutes les sources » si aucune. */
function sourceLabels(sources?: string[]): string {
  if (!sources || sources.length === 0) return 'Toutes les sources'
  return sources
    .map((id) => CONNECTOR_META.find((c) => c.id === id)?.label ?? id)
    .join(', ')
}

/**
 * Carte premium d'une veille : nom, intention, mots-clés inclus/exclus, sources
 * ciblées et dernier passage. Bascule active/en pause (Switch), édition et
 * suppression via menu (AlertDialog, jamais window.confirm).
 */
export function SavedSearchRow({
  search,
  onEdit,
}: {
  search: Doc<'savedSearches'>
  onEdit: () => void
}) {
  const update = useMutation(api.savedSearches.update)
  const remove = useMutation(api.savedSearches.remove)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

  const intent: VeilleIntent = search.intent ?? 'apply'
  const title = search.name?.trim() || search.keywords.join(', ') || 'Veille'

  async function toggleEnabled(next: boolean) {
    setToggling(true)
    try {
      await update({ id: search._id, enabled: next })
    } catch {
      toast.error('La mise à jour a échoué.')
    } finally {
      setToggling(false)
    }
  }

  async function confirmRemove() {
    try {
      await remove({ id: search._id })
      toast.success('Veille supprimée.')
    } catch {
      toast.error('La suppression a échoué.')
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-border-strong sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-sm font-semibold text-fg">{title}</h3>
          <Badge variant="accent">{INTENT_LABELS[intent]}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={search.enabled}
              onCheckedChange={toggleEnabled}
              disabled={toggling}
              aria-label={search.enabled ? 'Mettre en pause' : 'Activer'}
            />
            <span className="hidden text-xs font-medium text-fg-muted sm:inline">
              {search.enabled ? 'Active' : 'En pause'}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-fg-subtle sm:size-9"
                aria-label="Actions"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="size-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {search.keywords.map((kw) => (
          <Badge key={kw} variant="accent">
            {kw}
          </Badge>
        ))}
        {search.excludeKeywords?.map((kw) => (
          <Badge key={`x-${kw}`} variant="outline">
            sauf {kw}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
        <span>
          Sources :{' '}
          <span className="text-fg-muted">{sourceLabels(search.sources)}</span>
        </span>
        <span>
          {search.lastRunAt
            ? `Dernier passage ${formatRelativeTime(search.lastRunAt)} · ${search.lastMatchCount ?? 0} offre(s)`
            : 'Pas encore lancée'}
        </span>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer cette veille ?"
        description="Filon cessera de surveiller ces mots-clés. Les offres déjà importées sont conservées."
        onConfirm={confirmRemove}
      />
    </div>
  )
}
