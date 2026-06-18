import { useQuery } from 'convex/react'
import { TriangleAlert, X } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { OpportunityDetailContent } from './detail-content'

/**
 * Panneau de détail chargé par id. Gère les états premium (squelette,
 * introuvable / erreur) et délègue le corps à `OpportunityDetailContent`.
 *
 * Utilisé tel quel dans le panneau split desktop et dans la feuille mobile.
 * `onClose` ferme l'hôte ; `onRemoved` est appelé après suppression réussie.
 */
export function OpportunityDetailPane({
  opportunityId,
  onClose,
  onRemoved,
  showCloseButton = true,
}: {
  opportunityId: Id<'opportunities'>
  onClose: () => void
  onRemoved: () => void
  showCloseButton?: boolean
}) {
  // `get` relance « Introuvable » / « Non autorisé » ; on capte l'erreur via le
  // retour `null` du hook après échec — Convex renvoie undefined pendant le
  // chargement, puis lève. On encadre par un fallback dédié.
  const opportunity = useQuery(api.opportunities.get, { id: opportunityId })

  return (
    <div className="flex h-full flex-col">
      {showCloseButton && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 lg:px-5">
          <span className="eyebrow">{m.opp_detail_eyebrow()}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={m.opp_detail_close_aria()}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
        {opportunity === undefined ? (
          <PaneSkeleton />
        ) : opportunity === null ? (
          <NotFound onClose={onClose} />
        ) : (
          <OpportunityDetailContent
            opportunity={opportunity}
            layout="pane"
            onRemoved={onRemoved}
          />
        )}
      </div>
    </div>
  )
}

function PaneSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
    </div>
  )
}

function NotFound({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-fg">
          {m.opp_not_found_title()}
        </h2>
        <p className="mx-auto max-w-xs text-sm text-fg-muted">
          {m.opp_not_found_message()}
        </p>
      </div>
      <Button variant="outline" onClick={onClose}>
        {m.opp_close()}
      </Button>
    </div>
  )
}
