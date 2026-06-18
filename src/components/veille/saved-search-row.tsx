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
import { intentLabel, formatRelativeTime, type VeilleIntent } from './meta'
import { m } from '~/lib/paraglide/messages'

/** Libellés des sources ciblées, ou « Toutes les sources » si aucune. */
function sourceLabels(sources?: string[]): string {
  if (!sources || sources.length === 0) return m.veille_all_sources()
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
  const title =
    search.name?.trim() || search.keywords.join(', ') || m.veille_default_name()

  async function toggleEnabled(next: boolean) {
    setToggling(true)
    try {
      await update({ id: search._id, enabled: next })
    } catch {
      toast.error(m.veille_toast_update_failed())
    } finally {
      setToggling(false)
    }
  }

  async function confirmRemove() {
    try {
      await remove({ id: search._id })
      toast.success(m.veille_toast_deleted())
    } catch {
      toast.error(m.veille_toast_delete_failed())
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-border-strong sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-sm font-semibold text-fg">{title}</h3>
          <Badge variant="accent">{intentLabel(intent)}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={search.enabled}
              onCheckedChange={toggleEnabled}
              disabled={toggling}
              aria-label={
                search.enabled ? m.veille_pause() : m.veille_activate()
              }
            />
            <span className="hidden text-xs font-medium text-fg-muted sm:inline">
              {search.enabled ? m.veille_status_active() : m.veille_status_paused()}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-fg-subtle sm:size-9"
                aria-label={m.veille_actions()}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="size-4" />
                {m.veille_edit()}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                {m.veille_delete()}
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
            {m.veille_except({ kw })}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
        <span>
          {m.veille_sources_label()}{' '}
          <span className="text-fg-muted">{sourceLabels(search.sources)}</span>
        </span>
        <span>
          {search.lastRunAt
            ? (search.lastMatchCount ?? 0) > 1
              ? m.veille_last_run_plural({
                  time: formatRelativeTime(search.lastRunAt),
                  n: search.lastMatchCount ?? 0,
                })
              : m.veille_last_run_singular({
                  time: formatRelativeTime(search.lastRunAt),
                  n: search.lastMatchCount ?? 0,
                })
            : m.veille_not_run_yet()}
        </span>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={m.veille_delete_dialog_title()}
        description={m.veille_delete_dialog_desc()}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
