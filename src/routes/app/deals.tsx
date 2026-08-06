import { createFileRoute } from '@tanstack/react-router'
import { DealWorkspace } from '~/components/opportunities/deal-workspace'

export const Route = createFileRoute('/app/deals')({
  component: DealWorkspace,
  head: () => ({ meta: [{ title: 'Deals · Filon' }] }),
})
