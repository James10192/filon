import type { UIMessage } from '@convex-dev/agent/react'

const LEADING_INTERNAL_SECTIONS = [
  'Contexte interne, ne pas répéter',
  'Mode assistant :',
  'Réponds en français.',
  'Tu aides à comprendre',
  'Tu ne fais pas d\'analyse métier',
  'Si la demande porte sur ces sujets',
  'Si un vrai traitement humain',
  "Il n'existe pas de coach humain",
  'Fournis des recommandations',
  'Reste centré sur les données commerciales',
  "Quand l'utilisateur cite",
  'Si des données utiles manquent',
  'Mémoire durable utile :',
  'Rappels de conversations passées :',
]

function stripInternalContext(text: string): string {
  if (!text.startsWith('Contexte interne, ne pas répéter')) return text

  const remaining = text
    .split(/\n{2,}/)
    .filter((section) => section.trim().length > 0)
    .filter((section) => {
      const trimmed = section.trim()
      return !LEADING_INTERNAL_SECTIONS.some((prefix) =>
        trimmed.startsWith(prefix),
      )
    })
    .join('\n\n')
    .trim()

  return remaining || text
}

export function sanitizeCopilotMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => {
    if (message.role !== 'user') return message

    let changed = false
    const parts = message.parts.map((part) => {
      if (part.type !== 'text') return part
      const text = stripInternalContext(part.text)
      if (text === part.text) return part
      changed = true
      return { ...part, text }
    })

    return changed ? { ...message, parts } : message
  })
}
