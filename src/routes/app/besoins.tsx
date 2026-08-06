import { createFileRoute } from '@tanstack/react-router'
import { NeedsWorkspace } from '~/components/needs/needs-workspace'
export const Route = createFileRoute('/app/besoins')({ component: NeedsWorkspace, head: () => ({ meta: [{ title: 'Besoins · Filon' }] }) })
