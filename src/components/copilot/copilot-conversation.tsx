import type { UIMessage } from '@convex-dev/agent/react'
import { Sparkles, Loader2 } from 'lucide-react'
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
 * sinon la liste des messages streamés + un indicateur « réflexion » pendant
 * l'attente de la première réponse.
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
      <ConversationContent className="gap-6">
        {messages.map((message) => (
          <CopilotMessage
            key={message.key}
            message={message}
            pending={sending}
            onDecision={onDecision}
          />
        ))}
        {awaitingReply && (
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <Loader2 className="size-4 animate-spin text-accent" />
            <Sparkles className="size-3.5" />
            {m.copilot_thinking()}
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
