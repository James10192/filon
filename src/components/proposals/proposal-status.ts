import type { BadgeProps } from '~/components/ui/badge'

/** Statuts d'une proposition spontanée, alignés sur le contrat Convex. */
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'refused'

export const PROPOSAL_STATUSES: ProposalStatus[] = [
  'draft',
  'sent',
  'accepted',
  'refused',
]

/** Libellés FR par statut, pour les onglets, chips et toasts. */
export const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  accepted: 'Acceptée',
  refused: 'Refusée',
}

/** Variante de Badge à utiliser pour chaque statut. */
export const STATUS_BADGE: Record<ProposalStatus, NonNullable<BadgeProps['variant']>> = {
  draft: 'outline',
  sent: 'info',
  accepted: 'success',
  refused: 'danger',
}

/**
 * Formate un montant dans la devise donnée. Devise FCFA (XOF) sans décimales,
 * séparateur de milliers à la française. Retourne null si pas de montant.
 */
export function formatAmount(
  amount: number | undefined,
  currency: string | undefined,
): string | null {
  if (amount === undefined || amount === null) return null
  const code = currency ?? 'XOF'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'XOF' ? 0 : 2,
    }).format(amount)
  } catch {
    // Devise non reconnue par Intl : repli lisible.
    return `${new Intl.NumberFormat('fr-FR').format(amount)} ${code}`
  }
}

/** Phrase d'aide contextuelle par statut, pour l'en-tête du détail. */
export const STATUS_HINT: Record<ProposalStatus, string> = {
  draft: "Brouillon en cours. Marquez-la envoyée dès qu'elle part.",
  sent: 'Envoyée. En attente de réponse, planifiez une relance.',
  accepted: 'Acceptée. Convertissez-la en mission dans le pipeline.',
  refused: 'Refusée. Gardez la trace, une autre porte s\'ouvrira.',
}

/** Formate une date ISO en date courte FR, ou null si absente. */
export function formatDate(iso: string | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
