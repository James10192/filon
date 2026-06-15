import type { UIMessage } from '@convex-dev/agent/react'
import { Sparkles } from 'lucide-react'
import { MessageResponse } from '~/components/ai-elements/message'
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from '~/components/ai-elements/tool'
import { CopilotApprovalCard } from './copilot-approval-card'

type ApprovalOutput = {
  approvalRequired?: true
  tool?: string
  summary?: string
}

/** Détecte une sortie d'outil qui réclame une approbation (médiée client). */
function asApproval(output: unknown): { tool: string; summary: string } | null {
  if (output && typeof output === 'object') {
    const o = output as ApprovalOutput
    if (o.approvalRequired && o.tool) {
      return { tool: o.tool, summary: o.summary ?? o.tool }
    }
  }
  return null
}

/**
 * Rendu d'un message UI. Assistant : avatar accent + contenu (Streamdown +
 * cartes d'outil). Utilisateur : bulle alignée à droite. Apparition animée.
 */
export function CopilotMessage({
  message,
  pending,
  onDecision,
}: {
  message: UIMessage
  pending: boolean
  onDecision: (tool: string, decision: 'once' | 'always' | 'deny') => void
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    const text = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { text?: string }).text ?? '')
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
              />
            )
          }
          return null
        })}
      </div>
    </div>
  )
}

function ToolPartView({
  part,
  pending,
  onDecision,
}: {
  part: ToolPart
  pending: boolean
  onDecision: (tool: string, decision: 'once' | 'always' | 'deny') => void
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
