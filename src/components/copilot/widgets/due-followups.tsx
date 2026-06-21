import { BellRing } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { formatDateShort, dueStatus } from '~/components/opportunities/meta'
import { List } from './primitives'

/** Widget « relances à échéance » : intitulé + date colorée selon l'urgence. */

export type FollowupItem = { id: string; label: string; dueDate: string }

export function DueFollowups({ items }: { items: FollowupItem[] }) {
  return (
    <List
      items={items}
      icon={BellRing}
      count={(n) =>
        n > 1
          ? m.app_tool_followups_plural({ n })
          : m.app_tool_followups_singular({ n })
      }
      empty={m.app_tool_no_followups()}
      row={(f) => {
        const due = dueStatus(f.dueDate)
        return (
          <>
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              {f.label}
            </span>
            <span
              className={
                'assay shrink-0 text-xs ' +
                (due === 'overdue'
                  ? 'text-danger'
                  : due === 'today'
                    ? 'text-warning'
                    : 'text-fg-muted')
              }
            >
              {formatDateShort(f.dueDate)}
            </span>
          </>
        )
      }}
    />
  )
}
