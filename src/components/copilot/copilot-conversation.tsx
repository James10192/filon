import type { UIMessage } from '@convex-dev/agent/react'
import { Sparkles } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '~/components/ai-elements/conversation'
import { CopilotMessage } from './copilot-message'
import { CopilotEmpty } from './copilot-empty'

/**
 * Fil de conversation : état vide (prompts suggérés) tant qu'aucun message,
 * sinon la liste des messages streamés dans une colonne lisible centrée, plus un
 * indicateur « réflexion » (avatar + points animés) pendant l'attente.
 */
export function CopilotConversation({
  messages,
  sending,
  onPick,
  onDecision,
}: {
  messages: UIMessage[]
  sending: boolean
  onPick: (prompt: string) => void
  onDecision: (tool: string, decision: 'once' | 'always' | 'deny') => void
}) {
  if (messages.length === 0) {
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
            onDecision={onDecision}
          />
        ))}
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
