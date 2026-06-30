import type { BadgeProps } from '~/components/ui/badge'

export type ProposalKind = 'proposal' | 'proforma'

export function normalizeProposalKind(kind: string | undefined): ProposalKind {
  return kind === 'proforma' ? 'proforma' : 'proposal'
}

export function proposalKindLabel(kind: ProposalKind): string {
  return kind === 'proforma' ? 'Proforma' : 'Proposition'
}

export function proposalKindDescription(kind: ProposalKind): string {
  return kind === 'proforma'
    ? 'Document commercial provisoire, hors FNE, prêt à être partagé ou exporté.'
    : 'Offre commerciale réutilisable, suivie dans votre pipeline de propositions.'
}

export function proposalKindActionLabel(kind: ProposalKind): string {
  return kind === 'proforma' ? 'Nouvelle proforma' : 'Nouvelle proposition'
}

export function proposalKindBadge(
  kind: ProposalKind,
): NonNullable<BadgeProps['variant']> {
  return kind === 'proforma' ? 'warning' : 'outline'
}
