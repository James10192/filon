/**
 * Helpers partagés du back-office /admin : libellés, formats, mapping de badges.
 * Garde les composants visuels légers (pas de logique de format inline).
 */

import { m } from '~/lib/paraglide/messages'
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

/** Libellé d'un statut de feedback. */
export function feedbackStatusLabel(status: FeedbackStatus): string {
  switch (status) {
    case 'new':
      return m.admin_feedback_status_new()
    case 'in_progress':
      return m.admin_feedback_status_in_progress()
    case 'done':
      return m.admin_feedback_status_done()
  }
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

/** Libellé d'un type de feedback. */
export function feedbackTypeLabel(type: FeedbackType): string {
  switch (type) {
    case 'bug':
      return m.admin_feedback_type_bug()
    case 'idea':
      return m.admin_feedback_type_idea()
    case 'other':
      return m.admin_feedback_type_other()
  }
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

/** Date relative concise : « il y a 3 j », « il y a 2 h », « à l'instant ». */
export function formatRelative(epochMs: number): string {
  const diff = Date.now() - epochMs
  if (diff < 60_000) return m.admin_relative_now()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return m.admin_relative_minutes({ n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return m.admin_relative_hours({ n: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return m.admin_relative_days({ n: days })
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

/** Libellé d'un canal de paiement Paystack. */
export function paymentChannelLabel(channel: string | null): string {
  switch (channel) {
    case 'mobile_money':
      return m.admin_payment_channel_mobile_money()
    case 'card':
      return m.admin_payment_channel_card()
    case 'bank':
      return m.admin_payment_channel_transfer()
    case 'bank_transfer':
      return m.admin_payment_channel_transfer()
    case 'ussd':
      return m.admin_payment_channel_ussd()
    case 'qr':
      return m.admin_payment_channel_qr()
    case null:
      return m.admin_payment_channel_other()
    default:
      return channel
  }
}

/** Variante de badge + libellé d'un statut de transaction Paystack. */
export function paymentStatusMeta(status: string): {
  label: string
  variant: 'success' | 'danger' | 'warning' | 'outline'
} {
  switch (status) {
    case 'success':
      return { label: m.admin_payment_status_success(), variant: 'success' }
    case 'failed':
      return { label: m.admin_payment_status_failed(), variant: 'danger' }
    case 'abandoned':
      return { label: m.admin_payment_status_abandoned(), variant: 'danger' }
    case 'pending':
      return { label: m.admin_payment_status_pending(), variant: 'warning' }
    default:
      return { label: status, variant: 'outline' }
  }
}

/** Libellés des stades du pipeline (vue 360 compte). */
export function stageLabel(stage: string): string {
  switch (stage) {
    case 'lead':
      return m.admin_stage_lead()
    case 'contacted':
      return m.admin_stage_contacted()
    case 'applied':
      return m.admin_stage_applied()
    case 'interview':
      return m.admin_stage_interview()
    case 'negotiation':
      return m.admin_stage_negotiation()
    case 'won':
      return m.admin_stage_won()
    case 'lost':
      return m.admin_stage_lost()
    default:
      return stage
  }
}

/** Libellés des statuts de proposition. */
export function proposalStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return m.admin_proposal_status_draft()
    case 'sent':
      return m.admin_proposal_status_sent()
    case 'accepted':
      return m.admin_proposal_status_accepted()
    case 'refused':
      return m.admin_proposal_status_refused()
    default:
      return status
  }
}

/** Initiales d'un nom (max 2 lettres) pour le fallback d'avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
