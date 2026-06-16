/**
 * Helpers partagés du back-office /admin : libellés, formats, mapping de badges.
 * Garde les composants visuels légers (pas de logique de format inline).
 */

import { PLAN_LABELS, type Plan } from '~/lib/billing/plan'

export type FeedbackStatus = 'new' | 'in_progress' | 'done'
export type FeedbackType = 'bug' | 'idea' | 'other'

/** Variante de badge shadcn pour un palier d'abonnement. */
export function planBadgeVariant(
  plan: Plan,
): 'outline' | 'accent' | 'success' | 'info' {
  switch (plan) {
    case 'pro':
      return 'info'
    case 'pro_ai':
      return 'accent'
    case 'copilot':
      return 'success'
    default:
      return 'outline'
  }
}

/** Libellé FR d'un palier (réexport de la source unique billing). */
export function planLabel(plan: Plan): string {
  return PLAN_LABELS[plan] ?? plan
}

/** Libellé FR d'un statut de feedback. */
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: 'Nouveau',
  in_progress: 'En cours',
  done: 'Traité',
}

/** Ordre d'affichage des statuts dans les filtres et les Select. */
export const FEEDBACK_STATUS_ORDER: FeedbackStatus[] = [
  'new',
  'in_progress',
  'done',
]

/** Variante de badge pour un statut de feedback. */
export function feedbackStatusVariant(
  status: FeedbackStatus,
): 'accent' | 'warning' | 'success' {
  switch (status) {
    case 'new':
      return 'accent'
    case 'in_progress':
      return 'warning'
    case 'done':
      return 'success'
  }
}

/** Libellé FR d'un type de feedback. */
export const FEEDBACK_TYPE_LABEL: Record<FeedbackType, string> = {
  bug: 'Bug',
  idea: 'Idée',
  other: 'Autre',
}

/** Variante de badge pour un type de feedback. */
export function feedbackTypeVariant(
  type: FeedbackType,
): 'danger' | 'accent' | 'outline' {
  switch (type) {
    case 'bug':
      return 'danger'
    case 'idea':
      return 'accent'
    case 'other':
      return 'outline'
  }
}

/** Date courte FR : « 14 juin 2026 ». */
export function formatDate(epochMs: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(epochMs))
}

/** Date relative concise FR : « il y a 3 j », « il y a 2 h », « à l'instant ». */
export function formatRelative(epochMs: number): string {
  const diff = Date.now() - epochMs
  if (diff < 60_000) return "à l'instant"
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days} j`
  return formatDate(epochMs)
}

/** Nombre formaté FR (séparateur de milliers à espace fine). */
export function formatNumber(value: number): string {
  return value.toLocaleString('fr-FR').replace(/ /g, ' ')
}

/** Montant XOF entier : « 3 500 XOF ». */
export function formatXof(amount: number): string {
  return `${formatNumber(amount)} XOF`
}

/** Libellé FR d'un canal de paiement Paystack. */
export function paymentChannelLabel(channel: string | null): string {
  switch (channel) {
    case 'mobile_money':
      return 'Mobile Money'
    case 'card':
      return 'Carte'
    case 'bank':
      return 'Virement'
    case 'bank_transfer':
      return 'Virement'
    case 'ussd':
      return 'USSD'
    case 'qr':
      return 'QR'
    case null:
      return 'Autre'
    default:
      return channel
  }
}

/** Variante de badge + libellé FR d'un statut de transaction Paystack. */
export function paymentStatusMeta(status: string): {
  label: string
  variant: 'success' | 'danger' | 'warning' | 'outline'
} {
  switch (status) {
    case 'success':
      return { label: 'Réussi', variant: 'success' }
    case 'failed':
      return { label: 'Échoué', variant: 'danger' }
    case 'abandoned':
      return { label: 'Abandonné', variant: 'danger' }
    case 'pending':
      return { label: 'En attente', variant: 'warning' }
    default:
      return { label: status, variant: 'outline' }
  }
}

/** Libellés FR des stades du pipeline (vue 360 compte). */
export const STAGE_LABEL: Record<string, string> = {
  lead: 'Piste',
  contacted: 'Contacté',
  applied: 'Postulé',
  interview: 'Entretien',
  negotiation: 'Négociation',
  won: 'Gagné',
  lost: 'Perdu',
}

/** Libellés FR des statuts de proposition. */
export const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  accepted: 'Acceptée',
  refused: 'Refusée',
}

/** Initiales d'un nom (max 2 lettres) pour le fallback d'avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
