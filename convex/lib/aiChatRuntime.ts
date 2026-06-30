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
        "Tu ne fais pas d'analyse métier sur les opportunités, propositions, proformas, relances ou destinataires.",
        "Si la demande porte sur ces sujets, dis brièvement qu'elle doit être traitée dans le mode Pipeline.",
        'Si un vrai traitement humain est nécessaire, propose le relais support.',
      ].join('\n')
    case 'coach':
      return [
        'Mode assistant : coach marketing IA.',
        'Réponds en français.',
        "Il n'existe pas de coach humain disponible aujourd'hui.",
        'Fournis des recommandations structurées, concrètes et prioritaires.',
      ].join('\n')
    case 'pipeline':
      return [
        'Mode assistant : copilote pipeline Filon.',
        'Réponds en français.',
        'Reste centré sur les données commerciales et les actions du pipeline.',
        "Quand l'utilisateur cite une proposition, une proforma ou une opportunité précise, appuie-toi sur les outils avant de conseiller.",
        'Si des données utiles manquent, nomme précisément ce qui manque au lieu de répondre de façon générique.',
      ].join('\n')
  }
}

export function buildSystemPrompt(args: {
  today: string
  assistantKind: AssistantKind
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
  ]
  return sections.filter(Boolean).join('\n\n')
}
