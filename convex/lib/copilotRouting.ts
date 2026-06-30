function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const PIPELINE_ENTITY_SIGNALS = [
  'proposition',
  'proforma',
  'opportunite',
  'opportunites',
  'relance',
  'relances',
  'destinataire',
  'destinataires',
  'pipeline',
  'prospect',
  'devis',
]

const PIPELINE_ACTION_SIGNALS = [
  'faire avancer',
  'relancer',
  'envoyer',
  'suivre',
  'analyser',
  'priorite',
  'priorites',
  'statut',
  'brouillon',
  'closing',
  'convertir',
]

const SUPPORT_PRODUCT_SIGNALS = [
  'bug',
  'erreur',
  'page',
  'bouton',
  'connexion',
  'compte',
  'abonnement',
  'tarif',
  'comment utiliser',
  'ou se trouve',
  'je ne trouve pas',
  'ne marche pas',
]

export function looksLikePipelineRequest(prompt: string): boolean {
  const text = normalizeText(prompt)
  if (!text) return false

  const hasEntitySignal = PIPELINE_ENTITY_SIGNALS.some((signal) =>
    text.includes(signal),
  )
  if (!hasEntitySignal) return false

  const hasActionSignal = PIPELINE_ACTION_SIGNALS.some((signal) =>
    text.includes(signal),
  )
  const hasSupportSignal = SUPPORT_PRODUCT_SIGNALS.some((signal) =>
    text.includes(signal),
  )
  return hasActionSignal || !hasSupportSignal
}
