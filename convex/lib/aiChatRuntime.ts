import type { AssistantKind } from './assistant'
import type { Plan } from './plan'

export function allowsCoach(plan: Plan): boolean {
  return plan === 'copilot' || plan === 'copilot_max'
}

export function buildAssistantInstruction(kind: AssistantKind): string {
  switch (kind) {
    case 'support':
      return [
        'Mode assistant : support client Filon.',
        'Réponds en français.',
        'Tu aides à comprendre et utiliser le produit.',
        'Si un vrai traitement humain est nécessaire, propose le relais support.',
      ].join('\n')
    case 'coach':
      return [
        'Mode assistant : coach marketing IA.',
        'Réponds en français.',
        'Il n’existe pas de coach humain disponible aujourd’hui.',
        'Fournis des recommandations structurées, concrètes et prioritaires.',
      ].join('\n')
    case 'pipeline':
      return [
        'Mode assistant : copilote pipeline Filon.',
        'Réponds en français.',
        'Reste centré sur les données commerciales et les actions du pipeline.',
      ].join('\n')
  }
}

export function buildContextualPrompt(args: {
  today: string
  assistantKind: AssistantKind
  userPrompt: string
  durableLines: string[]
  semanticLines: string[]
}): string {
  const sections = [
    `Contexte interne, ne pas répéter : date du jour = ${args.today}.`,
    buildAssistantInstruction(args.assistantKind),
    args.durableLines.length > 0
      ? `Mémoire durable utile :\n${args.durableLines.join('\n')}`
      : '',
    args.semanticLines.length > 0
      ? `Rappels de conversations passées :\n${args.semanticLines.join('\n')}`
      : '',
    args.userPrompt,
  ]
  return sections.filter(Boolean).join('\n\n')
}
