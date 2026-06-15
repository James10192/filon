import type { UIMessage } from '@convex-dev/agent/react'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '~/components/ai-elements/message'
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
 * Rendu d'un message UI : parts texte (Streamdown) + parts outil (carte
 * repliable). Quand une écriture renvoie `approvalRequired`, on affiche la carte
 * de confirmation à la place du résultat brut.
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
  return (
    <Message from={message.role}>
      <MessageContent>
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
      </MessageContent>
    </Message>
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
    <Tool>
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
