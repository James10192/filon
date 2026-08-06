import { createFileRoute } from '@tanstack/react-router'
import { RelationshipWorkspace } from '~/components/relationships/relationship-workspace'
export const Route = createFileRoute('/app/relations')({ component: RelationshipWorkspace, head: () => ({ meta: [{ title: 'Relations · Filon' }] }) })
