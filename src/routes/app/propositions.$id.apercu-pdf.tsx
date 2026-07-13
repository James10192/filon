import { createFileRoute, useParams } from '@tanstack/react-router'
import type { Id } from '../../../convex/_generated/dataModel'
import { ProposalPdfPreview } from '~/components/proposals/proposal-pdf-preview'

export const Route = createFileRoute('/app/propositions/$id/apercu-pdf')({
  component: ProposalPdfPreviewPage,
  head: () => ({ meta: [{ title: 'Aperçu PDF · Filon' }] }),
})

function ProposalPdfPreviewPage() {
  const { id } = useParams({ from: '/app/propositions/$id/apercu-pdf' })
  return <ProposalPdfPreview proposalId={id as Id<'proposals'>} />
}
