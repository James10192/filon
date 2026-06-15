import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import {
  Plus,
  BellRing,
  ArrowRightLeft,
  FileText,
  MessageSquare,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'

type Action = Doc<'aiActions'>

const DAY = 86_400_000

const ICONS: Record<string, LucideIcon> = {
  create_opportunity: Plus,
  schedule_followup: BellRing,
  update_opportunity_stage: ArrowRightLeft,
  draft_application: FileText,
  add_activity: MessageSquare,
}

/** Cible de navigation vers l'entité touchée, ou null si non navigable. */
function entityLink(a: Action, onNavigate?: () => void): React.ReactNode {
  if (!a.entityId) return null
  if (a.entityType === 'opportunity') {
    return (
      <Link
        to="/app/opportunites/$id"
        params={{ id: a.entityId as Id<'opportunities'> }}
        search={{ view: 'liste' }}
        onClick={onNavigate}
        className="shrink-0 text-[11px] font-medium text-accent hover:text-accent-hover"
      >
        {m.copilot_view()}
      </Link>
    )
  }
  if (a.entityType === 'followup') {
    return (
      <Link
        to="/app/relances"
        onClick={onNavigate}
        className="shrink-0 text-[11px] font-medium text-accent hover:text-accent-hover"
      >
        {m.copilot_view()}
      </Link>
    )
  }
  return null
}

function group(actions: Action[], now: number) {
  const startOfToday = now - (now % DAY)
  const groups: { key: string; label: string; items: Action[] }[] = [
    { key: 'today', label: m.copilot_today(), items: [] },
    { key: 'yesterday', label: m.copilot_yesterday(), items: [] },
    { key: 'earlier', label: m.copilot_earlier(), items: [] },
  ]
  for (const a of actions) {
    if (a.createdAt >= startOfToday) groups[0].items.push(a)
    else if (a.createdAt >= startOfToday - DAY) groups[1].items.push(a)
    else groups[2].items.push(a)
  }
  return groups.filter((g) => g.items.length > 0)
}

/**
 * Journal des actions exécutées par le copilote : l'audit que ChatGPT ne peut
 * pas offrir (il ne fait que parler). Chaque ligne = ce que l'agent a fait, avec
 * un lien vers l'entité touchée.
 */
export function CopilotActivity({ onNavigate }: { onNavigate?: () => void }) {
  const actions = useQuery(api.aiChat.listActions, {})
  const groups = useMemo(
    () => (actions ? group(actions, Date.now()) : []),
    [actions],
  )

  if (actions === undefined) {
    return (
      <p className="px-4 pt-8 text-center text-xs text-fg-subtle">…</p>
    )
  }

  if (actions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent/10 text-accent">
          <ListChecks className="size-5" />
        </span>
        <p className="max-w-xs text-sm text-fg-muted">
          {m.copilot_no_actions()}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-2 py-3">
      {groups.map((g) => (
        <div key={g.key} className="space-y-1.5">
          <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
            {g.label}
          </p>
          {g.items.map((a) => {
            const Icon = ICONS[a.tool] ?? ListChecks
            return (
              <div
                key={a._id}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent/10 text-accent">
                  <Icon className="size-3.5" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-fg">
                  {a.summary}
                </p>
                {entityLink(a, onNavigate)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
