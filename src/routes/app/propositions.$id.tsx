import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { ProposalDetailContent } from '~/components/proposals/detail/detail-content'

export const Route = createFileRoute('/app/propositions/$id')({
  component: PropositionDetailPage,
  // La query Convex throw « Introuvable » / « Non autorisé » : capté ici.
  errorComponent: () => <NotFoundRoute />,
  head: () => ({ meta: [{ title: 'Proposition · Filon' }] }),
})

function PropositionDetailPage() {
  const { id } = useParams({ from: '/app/propositions/$id' })
  const proposal = useQuery(api.proposals.get, { id: id as Id<'proposals'> })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          to="/app/propositions"
          search={{ view: 'liste' }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          Propositions
        </Link>
      </div>

      {proposal === undefined ? (
        <DetailSkeleton />
      ) : (
        <ProposalDetailContent proposal={proposal} layout="page" />
      )}
    </div>
  )
}

function NotFoundRoute() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-fg">Proposition introuvable</h1>
      <p className="text-sm text-fg-muted">
        Cette proposition n'existe pas ou ne vous appartient pas.
      </p>
      <Button
        variant="outline"
        onClick={() =>
          navigate({ to: '/app/propositions', search: { view: 'liste' } })
        }
      >
        <ArrowLeft className="size-4" />
        Retour aux propositions
      </Button>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-44 w-full rounded-[var(--radius-lg)]" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  )
}
