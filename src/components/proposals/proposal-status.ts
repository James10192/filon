import type { BadgeProps } from '~/components/ui/badge'

/** Statuts d'une proposition spontanee, alignes sur le contrat Convex. */
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'refused'

export const PROPOSAL_STATUSES: ProposalStatus[] = [
  'draft',
  'sent',
  'accepted',
  'refused',
]

/** Libelles FR par statut, pour les onglets, chips et toasts. */
export const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyee',
  accepted: 'Acceptee',
  refused: 'Refusee',
}

/** Variante de Badge a utiliser pour chaque statut. */
export const STATUS_BADGE: Record<ProposalStatus, NonNullable<BadgeProps['variant']>> = {
  draft: 'outline',
  sent: 'info',
  accepted: 'success',
  refused: 'danger',
}

/**
 * Formate un montant dans la devise donnee. Devise FCFA (XOF) sans decimales,
 * separateur de milliers a la francaise. Retourne null si pas de montant.
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
