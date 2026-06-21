import { useState } from 'react'
import { useMutation } from 'convex/react'
import { BellRing, Check } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { toast } from '~/components/ui/sonner'
import { formatDateShort } from '~/components/opportunities/meta'
import { errorMessage } from '~/lib/billing/plan'
import { Card, Header, EmptyHint } from '../widgets/primitives'
import type { BriefFollowup } from './types'

/**
 * Section « Relances dues » du brief. Action gouvernée : « marquer traitée »
 * appelle la mutation app revalidée serveur (`followups.toggle`). Jamais
 * d'écriture optimiste non authentifiée : on attend la confirmation serveur.
 */
export function BriefFollowups({ items }: { items: BriefFollowup[] }) {
  const toggle = useMutation(api.followups.toggle)
  const [pending, setPending] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <Card>
        <Header icon={BellRing} label={m.brief_followups_title()} />
        <EmptyHint text={m.brief_followups_empty()} />
      </Card>
    )
  }

  return (
    <Card>
      <Header icon={BellRing} label={m.brief_followups_title()} />
      <ul className="divide-y divide-border">
        {items.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-2.5 px-3.5 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{f.title}</p>
              {f.opportunityTitle && (
                <p className="truncate text-xs text-fg-subtle">
                  {f.opportunityTitle}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 text-xs tabular-nums ${
                f.overdue ? 'text-danger' : 'text-fg-muted'
              }`}
            >
              {formatDateShort(f.dueDate)}
            </span>
            <button
              type="button"
              disabled={pending === f.id}
              aria-label={m.brief_followup_done()}
              title={m.brief_followup_done()}
              onClick={async () => {
                setPending(f.id)
                try {
                  await toggle({ id: f.id, done: true })
                  toast.success(m.brief_followup_done_toast())
                } catch (error) {
                  toast.error(errorMessage(error, m.brief_action_error()))
                } finally {
                  setPending(null)
                }
              }}
              className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border text-fg-muted transition-colors hover:border-success/40 hover:bg-success-soft hover:text-success disabled:opacity-50"
            >
              <Check className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
