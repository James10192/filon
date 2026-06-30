import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'

type SupportMessage = {
  _id: string
  role: 'user' | 'agent' | 'system'
  via: 'ai' | 'human'
  body: string
  actorName?: string
  createdAt: number
}

type SupportThreadState = {
  status: 'pending' | 'active' | 'released' | 'dismissed'
  assignedAgentName?: string
}

export function SupportLiveThread({
  thread,
  messages,
}: {
  thread: SupportThreadState
  messages: SupportMessage[]
}) {
  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-border bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Relais humain</Badge>
        <Badge variant={thread.status === 'active' ? 'success' : 'outline'}>
          {statusLabel(thread.status)}
        </Badge>
        {thread.assignedAgentName && (
          <span className="text-xs text-fg-muted">
            Agent : {thread.assignedAgentName}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {messages.map((message) => (
          <div
            key={message._id}
            className={cn(
              'rounded-[var(--radius-sm)] px-3 py-2 text-sm',
              message.role === 'system'
                ? 'border border-dashed border-border bg-bg text-fg-muted'
                : message.role === 'agent'
                  ? 'bg-accent/8 text-fg'
                  : 'bg-bg text-fg',
            )}
          >
            <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
              {message.role === 'system'
                ? 'Systeme'
                : message.role === 'agent'
                  ? message.actorName ?? 'Agent'
                  : 'Vous'}
            </p>
            <p className="whitespace-pre-wrap">{message.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function statusLabel(status: SupportThreadState['status']): string {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'active':
      return 'Pris en charge'
    case 'released':
      return 'Reprise IA'
    case 'dismissed':
      return 'Cloture'
  }
}
