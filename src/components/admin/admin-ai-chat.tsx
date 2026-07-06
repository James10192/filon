import { Bot, CheckCircle2, Inbox, User, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { MessageResponse } from '~/components/ai-elements/message'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'

export type AdminAiMessage = {
  key: string
  role: string
  kind: 'text' | 'tool_call' | 'tool_result' | 'empty'
  text: string
  createdAt: number
  stepOrder?: number
  model?: string
  status?: string
  toolName?: string
  toolInput?: string
  toolOutput?: string
  totalTokens?: number
}

export function ConversationPanel({
  messages,
  emptyState,
}: {
  messages: AdminAiMessage[]
  emptyState: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-fg">Conversation</p>
          <p className="text-xs text-fg-muted">
            Messages, outils appelés et réponses réelles du copilote.
          </p>
        </div>
        <Badge variant="outline">{messages.length} éléments</Badge>
      </div>
      <div className="max-h-[68vh] space-y-4 overflow-y-auto px-4 py-5">
        {messages.length === 0
          ? emptyState
          : messages.map((message) => (
              <ChatMessage key={message.key} message={message} />
            ))}
      </div>
    </div>
  )
}

function ChatMessage({ message }: { message: AdminAiMessage }) {
  if (message.kind === 'tool_call' || message.kind === 'tool_result') {
    return <ToolMessage message={message} />
  }

  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser && 'justify-end')}>
      {!isUser && (
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Bot className="size-4" />
        </span>
      )}
      <div
        className={cn(
          'max-w-[min(42rem,85%)] rounded-[var(--radius-lg)] px-4 py-3 shadow-sm',
          isUser
            ? 'bg-accent text-accent-fg'
            : 'border border-border bg-surface text-fg',
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant={isUser ? 'default' : 'accent'}>
            {isUser ? 'Utilisateur' : 'Assistant'}
          </Badge>
          {message.model && <Badge variant="outline">{message.model}</Badge>}
          {message.totalTokens !== undefined && (
            <span className="text-xs opacity-70">
              {message.totalTokens.toLocaleString('fr-FR')} tokens
            </span>
          )}
        </div>
        {message.text ? (
          isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.text}
            </p>
          ) : (
            <MessageResponse className="text-sm leading-relaxed">
              {message.text}
            </MessageResponse>
          )
        ) : (
          <p className="text-sm opacity-70">Message vide.</p>
        )}
      </div>
      {isUser && (
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
          <User className="size-4" />
        </span>
      )}
    </div>
  )
}

function ToolMessage({ message }: { message: AdminAiMessage }) {
  const isResult = message.kind === 'tool_result'
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-2xl rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'flex size-7 items-center justify-center rounded-[var(--radius-sm)]',
              isResult ? 'bg-success-soft text-success' : 'bg-info-soft text-info',
            )}
          >
            {isResult ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Wrench className="size-4" />
            )}
          </span>
          <Badge variant={isResult ? 'success' : 'info'}>
            {isResult ? 'Résultat outil' : 'Appel outil'}
          </Badge>
          {message.toolName && <Badge variant="outline">{message.toolName}</Badge>}
          {message.stepOrder !== undefined && (
            <span className="ml-auto text-xs text-fg-subtle">
              Étape {message.stepOrder}
            </span>
          )}
        </div>
        {(message.toolInput || message.toolOutput) && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-fg-muted">
              Voir les données
            </summary>
            <pre className="mt-2 max-h-52 overflow-auto rounded-[var(--radius-sm)] bg-bg p-3 text-xs text-fg-muted">
              {message.toolOutput ?? message.toolInput}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
