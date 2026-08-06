import { createFileRoute } from '@tanstack/react-router'
import { PageToolbar } from '~/components/app/page-toolbar'
import { GrowthPanel } from '~/components/growth/growth-panel'
export const Route = createFileRoute('/app/clients')({ component: ClientsPage, head: () => ({ meta: [{ title: 'Clients · Filon' }] }) })
function ClientsPage() { return <div className="flex flex-col"><PageToolbar title="Clients" subtitle="Le closing ouvre une boucle continue de fidélisation et de développement." /><GrowthPanel /></div> }
