import { useQuery } from 'convex/react'
import { TriangleAlert, X } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { ProposalDetailContent } from './detail-content'

/**
 * Panneau de détail chargé par id. Gère les états premium (squelette,
 * introuvable / erreur) et délègue le corps à `ProposalDetailContent`.
 *
 * Utilisé tel quel dans le panneau split desktop et dans la feuille mobile.
 * `onClose` ferme l'hôte.
 */
export function ProposalDetailPane({
  proposalId,
  onClose,
  showCloseButton = true,
}: {
  proposalId: Id<'proposals'>
  onClose: () => void
  showCloseButton?: boolean
}) {
  const proposal = useQuery(api.proposals.get, { id: proposalId })

  return (
    <div className="flex h-full flex-col">
      {showCloseButton && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 lg:px-5">
          <span className="eyebrow">Détail</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Fermer le détail"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
        {proposal === undefined ? (
          <PaneSkeleton />
        ) : (
          <ProposalDetailContent proposal={proposal} layout="pane" />
        )}
      </div>
    </div>
  )
}

function PaneSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
    </div>
  )
}
