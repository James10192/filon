import { ShieldAlert } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'

/**
 * Carte de confirmation pour une écriture en attente d'approbation. Branche les
 * trois décisions sur `respondApproval` (médié par `useCopilot.approve`) :
 * accepter une fois, toujours accepter, refuser.
 */
export function CopilotApprovalCard({
  summary,
  pending,
  onDecision,
}: {
  summary: string
  pending: boolean
  onDecision: (decision: 'once' | 'always' | 'deny') => void
}) {
  return (
    <div className="not-prose w-full rounded-[var(--radius)] border border-accent/30 bg-accent/5 p-3">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-fg">
            {m.copilot_approve_title()}
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">{summary}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => onDecision('deny')}
        >
          {m.copilot_approve_deny()}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => onDecision('always')}
        >
          {m.copilot_approve_always()}
        </Button>
        <Button size="sm" disabled={pending} onClick={() => onDecision('once')}>
          {m.copilot_approve_once()}
        </Button>
      </div>
    </div>
  )
}
