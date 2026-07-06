import type { MessageDoc } from '@convex-dev/agent'

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

type AgentPart = {
  type?: string
  text?: string
  toolName?: string
  input?: unknown
  args?: unknown
  output?: { value?: unknown } | unknown
}

function stringifyCompact(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function cleanUserText(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('Contexte')) return trimmed
  const blocks = trimmed.split(/\n\s*\n/)
  return (blocks.at(-1) ?? trimmed).trim()
}

function textFromContent(content: unknown, role: string): string {
  if (typeof content === 'string') {
    return role === 'user' ? cleanUserText(content) : content.trim()
  }
  if (!Array.isArray(content)) return ''
  const text = content
    .map((part: AgentPart) =>
      part?.type === 'text' && typeof part.text === 'string'
        ? part.text.trim()
        : '',
    )
    .filter(Boolean)
    .join('\n\n')
  return role === 'user' ? cleanUserText(text) : text
}

function firstToolPart(content: unknown): AgentPart | null {
  if (!Array.isArray(content)) return null
  return (
    content.find((part: AgentPart) =>
      part?.type === 'tool-call' || part?.type === 'tool-result',
    ) ?? null
  )
}

export function serializeAdminAiMessage(
  message: MessageDoc,
  index: number,
): AdminAiMessage {
  const raw = message as {
    _id?: string
    _creationTime?: number
    message?: { role?: string; content?: unknown }
    role?: string
    text?: string
    stepOrder?: number
    model?: string
    status?: string
    usage?: { totalTokens?: number }
  }
  const role = raw.message?.role ?? raw.role ?? 'assistant'
  const content = raw.message?.content
  const toolPart = firstToolPart(content)
  const base = {
    key: raw._id ?? `${index}`,
    role,
    createdAt: raw._creationTime ?? 0,
    ...(raw.stepOrder !== undefined ? { stepOrder: raw.stepOrder } : {}),
    ...(raw.model ? { model: raw.model } : {}),
    ...(raw.status ? { status: raw.status } : {}),
    ...(raw.usage?.totalTokens !== undefined
      ? { totalTokens: raw.usage.totalTokens }
      : {}),
  }

  if (toolPart?.type === 'tool-call') {
    return {
      ...base,
      kind: 'tool_call',
      text: `Appel outil : ${toolPart.toolName ?? 'outil'}`,
      toolName: toolPart.toolName,
      toolInput: stringifyCompact(toolPart.input ?? toolPart.args),
    }
  }

  if (toolPart?.type === 'tool-result') {
    const output =
      toolPart.output &&
      typeof toolPart.output === 'object' &&
      'value' in toolPart.output
        ? (toolPart.output as { value?: unknown }).value
        : toolPart.output
    return {
      ...base,
      kind: 'tool_result',
      text: `Résultat outil : ${toolPart.toolName ?? 'outil'}`,
      toolName: toolPart.toolName,
      toolOutput: stringifyCompact(output),
    }
  }

  const fallbackText =
    typeof raw.text === 'string' && raw.text.trim()
      ? raw.text
      : textFromContent(content, role)
  const text =
    role === 'user' ? cleanUserText(fallbackText) : fallbackText.trim()
  return {
    ...base,
    kind: text ? 'text' : 'empty',
    text,
  }
}
