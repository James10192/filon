import type { UIMessage } from '@convex-dev/agent/react'
import { Sparkles, ThumbsDown, ThumbsUp, LifeBuoy } from 'lucide-react'
import { MessageResponse } from '~/components/ai-elements/message'
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from '~/components/ai-elements/tool'
import { Button } from '~/components/ui/button'
import type { AssistantKind } from './assistant-kinds'
import { CopilotApprovalCard } from './copilot-approval-card'
import { renderToolResult } from './widgets'

type ApprovalOutput = {
  approvalRequired?: true
  tool?: string
  summary?: string
}

function asApproval(output: unknown): { tool: string; summary: string } | null {
  if (output && typeof output === 'object') {
    const candidate = output as ApprovalOutput
    if (candidate.approvalRequired && candidate.tool) {
      return { tool: candidate.tool, summary: candidate.summary ?? candidate.tool }
    }
  }
  return null
}

export function CopilotMessage({
  message,
  pending,
  assistantKind,
  threadId,
  onDecision,
  onNavigate,
  onRate,
  onRequestHandoff,
}: {
  message: UIMessage
  pending: boolean
  assistantKind: AssistantKind
  threadId: string | null
  onDecision: (tool: string, decision: 'once' | 'always' | 'deny') => void
  onNavigate?: () => void
  onRate: (messageKey: string, rating: 'up' | 'down') => void
  onRequestHandoff?: () => void
}) {
  if (message.role === 'user') {
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text?: string }).text ?? '')
      .join('')
    return (
      <div className="flex animate-in fade-in slide-in-from-bottom-1 justify-end duration-300">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md border border-border bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed text-fg shadow-[var(--shadow-sm)]">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex animate-in fade-in slide-in-from-bottom-1 gap-3 duration-300">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent/10 text-accent ring-1 ring-accent/15">
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-3 pt-0.5 text-sm leading-relaxed text-fg">
        {message.parts.map((part, index) => {
          const key = `${message.key}-${index}`
          if (part.type === 'text') {
            return part.text ? (
              <MessageResponse key={key}>{part.text}</MessageResponse>
            ) : null
          }
          if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
            return (
              <ToolPartView
                key={key}
                part={part as unknown as ToolPart}
                pending={pending}
                onDecision={onDecision}
                onNavigate={onNavigate}
              />
            )
          }
          return null
        })}
        {threadId && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRate(message.key, 'up')}
            >
              <ThumbsUp className="size-4" />
              Utile
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRate(message.key, 'down')}
            >
              <ThumbsDown className="size-4" />
              A revoir
            </Button>
            {assistantKind === 'support' && onRequestHandoff && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRequestHandoff}
              >
                <LifeBuoy className="size-4" />
                Parler a un agent
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolPartView({
  part,
  pending,
  onDecision,
  onNavigate,
}: {
  part: ToolPart
  pending: boolean
  onDecision: (tool: string, decision: 'once' | 'always' | 'deny') => void
  onNavigate?: () => void
}) {
  const approval =
    part.state === 'output-available' ? asApproval(part.output) : null
  if (approval) {
    return (
      <CopilotApprovalCard
        summary={approval.summary}
        pending={pending}
        onDecision={(decision) => onDecision(approval.tool, decision)}
      />
    )
  }

  const toolName =
    part.type === 'dynamic-tool'
      ? part.toolName
      : part.type.replace(/^tool-/, '')
  if (part.state === 'output-available') {
    const rich = renderToolResult(toolName, part.output, onNavigate)
    if (rich) return <>{rich}</>
  }

  return (
    <Tool className="border-border bg-bg">
      {part.type === 'dynamic-tool' ? (
        <ToolHeader
          type={part.type}
          state={part.state}
          toolName={part.toolName}
        />
      ) : (
        <ToolHeader type={part.type} state={part.state} />
      )}
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput output={part.output} errorText={part.errorText} />
      </ToolContent>
    </Tool>
  )
}
