export const ASSISTANT_KINDS = ['support', 'pipeline', 'coach'] as const

export type AssistantKind = (typeof ASSISTANT_KINDS)[number]

export function assistantKindLabel(kind: AssistantKind): string {
  switch (kind) {
    case 'support':
      return 'Support'
    case 'pipeline':
      return 'Pipeline'
    case 'coach':
      return 'Coach'
  }
}

export function assistantKindDescription(kind: AssistantKind): string {
  switch (kind) {
    case 'support':
      return 'Aide produit et support client'
    case 'pipeline':
      return 'Copilot commercial sur vos donnees'
    case 'coach':
      return 'Coaching marketing IA, sans relais humain'
  }
}
