import { useMemo, useState } from 'react'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Plus, Search, Check, Pencil, MessageSquare } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'

type Thread = Doc<'aiThreads'>

const DAY = 86_400_000

/** Regroupe les fils par tranche (aujourd'hui / hier / plus tôt). */
function groupByDate(threads: Thread[], now: number) {
  const startOfToday = now - (now % DAY)
  const groups: { key: string; label: string; items: Thread[] }[] = [
    { key: 'today', label: m.copilot_today(), items: [] },
    { key: 'yesterday', label: m.copilot_yesterday(), items: [] },
    { key: 'earlier', label: m.copilot_earlier(), items: [] },
  ]
  for (const t of threads) {
    if (t.lastMessageAt >= startOfToday) groups[0].items.push(t)
    else if (t.lastMessageAt >= startOfToday - DAY) groups[1].items.push(t)
    else groups[2].items.push(t)
  }
  return groups.filter((g) => g.items.length > 0)
}

/**
 * Rail d'historique du copilote : bouton « Nouveau », recherche, et la liste des
 * fils groupés par date avec renommage en ligne. Le fil actif est surligné.
 */
export function CopilotThreadsRail({
  threads,
  activeThreadId,
  onSelect,
  onNew,
  onRename,
}: {
  threads: Thread[]
  activeThreadId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
}) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((t) => (t.title ?? '').toLowerCase().includes(q))
  }, [threads, query])

  const groups = useMemo(() => groupByDate(filtered, Date.now()), [filtered])

  function commit(id: string) {
    const title = draft.trim()
    if (title) onRename(id, title)
    setEditing(null)
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <button
        type="button"
        onClick={onNew}
        className="flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius)] bg-accent text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        <Plus className="size-4" />
        {m.copilot_new()}
      </button>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.copilot_search_threads()}
          className="h-8 w-full rounded-[var(--radius)] border border-border bg-bg pl-8 pr-2 text-xs text-fg placeholder:text-fg-subtle focus:border-border-strong focus:outline-none"
        />
      </div>

      <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1">
        {groups.length === 0 && (
          <p className="px-1 pt-4 text-center text-xs text-fg-subtle">
            {m.copilot_no_threads()}
          </p>
        )}
        {groups.map((group) => (
          <div key={group.key} className="space-y-0.5">
            <p className="px-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
              {group.label}
            </p>
            {group.items.map((t) => {
              const active = t.threadId === activeThreadId
              if (editing === t.threadId) {
                return (
                  <div key={t.threadId} className="flex items-center gap-1 px-1">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commit(t.threadId)
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      onBlur={() => commit(t.threadId)}
                      className="h-8 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-border-strong bg-bg px-2 text-xs text-fg focus:outline-none"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commit(t.threadId)}
                      className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-accent hover:bg-surface-2"
                    >
                      <Check className="size-3.5" />
                    </button>
                  </div>
                )
              }
              return (
                <div
                  key={t.threadId}
                  className={cn(
                    'group flex items-center gap-1.5 rounded-[var(--radius-sm)] pr-1 transition-colors',
                    active ? 'bg-accent/10' : 'hover:bg-surface-2',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(t.threadId)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-2 text-left"
                  >
                    <MessageSquare
                      className={cn(
                        'size-3.5 shrink-0',
                        active ? 'text-accent' : 'text-fg-subtle',
                      )}
                    />
                    <span
                      className={cn(
                        'truncate text-xs',
                        active ? 'font-medium text-fg' : 'text-fg-muted',
                      )}
                    >
                      {t.title ?? m.copilot_untitled()}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={m.copilot_rename()}
                    onClick={() => {
                      setEditing(t.threadId)
                      setDraft(t.title ?? '')
                    }}
                    className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-fg-subtle opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
                  >
                    <Pencil className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
