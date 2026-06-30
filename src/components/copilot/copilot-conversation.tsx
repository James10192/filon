import type { UIMessage } from '@convex-dev/agent/react'
import { Sparkles } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '~/components/ai-elements/conversation'
import type { AssistantKind } from './assistant-kinds'
import { CopilotEmpty } from './copilot-empty'
import { CopilotMessage } from './copilot-message'
import { SupportLiveThread } from './support-live-thread'

type SupportState = {
  thread: {
    status: 'pending' | 'active' | 'released' | 'dismissed'
    assignedAgentName?: string
  }
  messages: Array<{
    _id: string
    role: 'user' | 'agent' | 'system'
    via: 'ai' | 'human'
    body: string
    actorName?: string
    createdAt: number
  }>
} | null

export function CopilotConversation({
  messages,
  sending,
  onPick,
  onDecision,
  onNavigate,
  assistantKind,
  threadId,
  supportState,
  onRate,
  onRequestHandoff,
}: {
  messages: UIMessage[]
  sending: boolean
  onPick: (prompt: string) => void
  onDecision: (tool: string, decision: 'once' | 'always' | 'deny') => void
  onNavigate?: () => void
  assistantKind: AssistantKind
  threadId: string | null
  supportState: SupportState
  onRate: (messageKey: string, rating: 'up' | 'down') => void
  onRequestHandoff?: () => void
}) {
  if (messages.length === 0 && !supportState) {
    return <CopilotEmpty onPick={onPick} />
  }

  const last = messages[messages.length - 1]
  const awaitingReply = sending && last?.role === 'user'

  return (
    <Conversation className="flex-1">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-1 py-1">
        {messages.map((message) => (
          <CopilotMessage
            key={message.key}
            message={message}
            pending={sending}
            assistantKind={assistantKind}
            threadId={threadId}
            onDecision={onDecision}
            onNavigate={onNavigate}
            onRate={onRate}
            onRequestHandoff={onRequestHandoff}
          />
        ))}
        {supportState && (
          <SupportLiveThread
            thread={supportState.thread}
            messages={supportState.messages}
          />
        )}
        {awaitingReply && (
          <div className="flex animate-in fade-in gap-3 duration-300">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent/10 text-accent ring-1 ring-accent/15">
              <Sparkles className="size-3.5" />
            </span>
            <div className="flex items-center gap-2 pt-1.5">
              <span className="flex gap-1">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </span>
              <span className="text-xs text-fg-subtle">
                {m.copilot_thinking()}
              </span>
            </div>
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1.5 animate-bounce rounded-full bg-accent"
      style={{ animationDelay: delay }}
    />
  )
}
