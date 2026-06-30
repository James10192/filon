import { v } from 'convex/values'

export const ASSISTANT_KINDS = ['support', 'pipeline', 'coach'] as const

export type AssistantKind = (typeof ASSISTANT_KINDS)[number]

export const assistantKindValidator = v.union(
  v.literal('support'),
  v.literal('pipeline'),
  v.literal('coach'),
)

export const assistantKindsRequiringCopilot = new Set<AssistantKind>([
  'pipeline',
  'coach',
])

export function assistantLabel(kind: AssistantKind): string {
  switch (kind) {
    case 'support':
      return 'Support Filon'
    case 'pipeline':
      return 'Copilot pipeline'
    case 'coach':
      return 'Coach marketing'
  }
}

export function assistantDefaultTitle(kind: AssistantKind): string {
  switch (kind) {
    case 'support':
      return 'Support Filon'
    case 'pipeline':
      return 'Copilot pipeline'
    case 'coach':
      return 'Coach marketing'
  }
}
