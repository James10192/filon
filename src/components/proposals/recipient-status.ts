import { m } from '~/lib/paraglide/messages'
import type { BadgeProps } from '~/components/ui/badge'

/**
 * Statuts d'un DESTINATAIRE de proposition (pipeline multi-cible). Une
 * proposition est une offre reutilisable adressee a plusieurs cibles ; chaque
 * destinataire est suivi individuellement avec ce statut.
 */
export type RecipientStatus = 'pending' | 'sent' | 'accepted' | 'refused'

export const RECIPIENT_STATUSES: RecipientStatus[] = [
  'pending',
  'sent',
  'accepted',
  'refused',
]

/** Libelles FR par statut de destinataire. */
export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  pending: m.prop_recipient_status_pending(),
  sent: m.prop_recipient_status_sent(),
  accepted: m.prop_recipient_status_accepted(),
  refused: m.prop_recipient_status_refused(),
}

/** Variante de Badge a utiliser pour chaque statut de destinataire. */
export const RECIPIENT_STATUS_BADGE: Record<
  RecipientStatus,
  NonNullable<BadgeProps['variant']>
> = {
  pending: 'outline',
  sent: 'info',
  accepted: 'success',
  refused: 'danger',
}

/** Phrase d'aide contextuelle par statut, pour le pipeline de la proposition. */
export const RECIPIENT_STATUS_HINT: Record<RecipientStatus, string> = {
  pending: m.prop_recipient_hint_pending(),
  sent: m.prop_recipient_hint_sent(),
  accepted: m.prop_recipient_hint_accepted(),
  refused: m.prop_recipient_hint_refused(),
}

/** Compteurs agreges sur une liste de destinataires (par statut). */
export type RecipientSummary = {
  total: number
  pending: number
  sent: number
  accepted: number
  refused: number
}

/** Agrege une liste de destinataires en compteurs par statut. */
export function summarizeRecipients(
  recipients: ReadonlyArray<{ status: string }> | undefined,
): RecipientSummary {
  const summary: RecipientSummary = {
    total: 0,
    pending: 0,
    sent: 0,
    accepted: 0,
    refused: 0,
  }
  if (!recipients) return summary
  for (const r of recipients) {
    summary.total += 1
    if (r.status === 'pending') summary.pending += 1
    else if (r.status === 'sent') summary.sent += 1
    else if (r.status === 'accepted') summary.accepted += 1
    else if (r.status === 'refused') summary.refused += 1
  }
  return summary
}

/**
 * Phrase de synthese FR pour une liste de destinataires (cartes, colonnes,
 * tableau). Ex « 3 destinataires · 1 accepté ». Retourne null si aucun
 * destinataire (l'appelant affiche alors le repli historique « entreprise cible »).
 */
export function recipientSummaryLabel(summary: RecipientSummary): string | null {
  if (summary.total === 0) return null
  const base =
    summary.total === 1
      ? m.prop_summary_recipient_one()
      : m.prop_summary_recipient_many({ n: summary.total })
  const highlight =
    summary.accepted > 0
      ? m.prop_summary_accepted({ n: summary.accepted, s: summary.accepted > 1 ? 's' : '' })
      : summary.refused > 0
        ? m.prop_summary_refused({ n: summary.refused, s: summary.refused > 1 ? 's' : '' })
        : summary.sent > 0
          ? m.prop_summary_sent({ n: summary.sent, s: summary.sent > 1 ? 's' : '' })
          : null
  return highlight ? `${base} · ${highlight}` : base
}
