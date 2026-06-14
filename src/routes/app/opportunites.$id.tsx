import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { OpportunityDetailContent } from '~/components/opportunities/detail/detail-content'

export const Route = createFileRoute('/app/opportunites/$id')({
  component: OpportuniteDetailPage,
  // get() relance « Introuvable » / « Non autorisé » : captée par cet errorComponent.
  errorComponent: () => <NotFoundRoute />,
  head: () => ({ meta: [{ title: 'Opportunité · Filon' }] }),
})

function OpportuniteDetailPage() {
  const { id } = useParams({ from: '/app/opportunites/$id' })
  const navigate = useNavigate()
  const opportunity = useQuery(api.opportunities.get, {
    id: id as Id<'opportunities'>,
  })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          to="/app/opportunites"
          search={{ view: 'liste' }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          Opportunités
        </Link>
      </div>

      {opportunity === undefined ? (
        <DetailSkeleton />
      ) : (
        <OpportunityDetailContent
          opportunity={opportunity}
          layout="page"
          onRemoved={() =>
            navigate({ to: '/app/opportunites', search: { view: 'liste' } })
          }
        />
      )}
    </div>
  )
}

function NotFoundRoute() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-fg">Opportunité introuvable</h1>
      <p className="text-sm text-fg-muted">
        Cette opportunité n'existe pas ou ne vous appartient pas.
      </p>
      <Button
        variant="outline"
        onClick={() =>
          navigate({ to: '/app/opportunites', search: { view: 'liste' } })
        }
      >
        <ArrowLeft className="size-4" />
        Retour aux opportunités
      </Button>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  )
}
