import { Link } from '@tanstack/react-router'
import { ArrowUpRight, CalendarClock } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Badge } from '~/components/ui/badge'
import {
  STAGE_META,
  TYPE_META,
  PRIORITY_META,
  formatDateShort,
  dueStatus,
  type Stage,
  type OppType,
  type Priority,
} from '~/components/opportunities/meta'

/**
 * Vue compacte d'une opportunité telle que renvoyée par les outils du copilote
 * (`list_opportunities`, `search_opportunities`, `opportunities_needing_action`).
 * Tous les codes techniques sont traduits en libellés FR via les méta canoniques.
 */
export type CopilotOpp = {
  id: string
  title: string
  type: OppType
  stage: Stage
  priority: Priority
  companyName: string | null
  deadline: string | null
  nextActionAt: string | null
  hasNextAction: boolean
  tags: string[]
}

/**
 * Carte d'opportunité « generative UI » : type + entreprise, étape (libellé FR
 * coloré), priorité, badge « sans prochaine action » le cas échéant, échéance, et
 * une action rapide (flèche) qui ouvre la fiche. `onNavigate` ferme le tiroir
 * copilote quand la carte est rendue dans le slide-over (no-op en plein écran).
 */
export function CopilotOppCard({
  opp,
  onNavigate,
}: {
  opp: CopilotOpp
  onNavigate?: () => void
}) {
  const type = TYPE_META[opp.type]
  const TypeIcon = type?.icon
  const stage = STAGE_META[opp.stage]
  const priority = PRIORITY_META[opp.priority]
  const due = dueStatus(opp.deadline)

  return (
    <Link
      to="/app/opportunites/$id"
      params={{ id: opp.id as Id<'opportunities'> }}
      search={{ view: 'liste' }}
      onClick={onNavigate}
      className="group flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:ring-inset"
    >
      {TypeIcon && (
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-fg-subtle"
          aria-hidden
        >
          <TypeIcon className="size-3.5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
            {opp.title}
          </span>
          <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        {opp.companyName && (
          <p className="mt-0.5 truncate text-xs text-fg-muted">
            {opp.companyName}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={stage?.chip}>
            {stage?.label ?? opp.stage}
          </Badge>
          {opp.priority === 'high' && (
            <Badge variant="outline" className={priority.chip}>
              {priority.label}
            </Badge>
          )}
          {!opp.hasNextAction && (
            <Badge variant="warning">{m.app_copilot_no_next_action()}</Badge>
          )}
          {opp.deadline && (
            <span
              className={
                'assay inline-flex items-center gap-1 text-xs ' +
                (due === 'overdue'
                  ? 'text-danger'
                  : due === 'today'
                    ? 'text-warning'
                    : 'text-fg-muted')
              }
            >
              <CalendarClock className="size-3" />
              {formatDateShort(opp.deadline)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
