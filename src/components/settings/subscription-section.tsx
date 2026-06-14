import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Sparkles } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { PLAN_LABELS } from '~/lib/billing/plan'

/**
 * Section Abonnement des réglages : badge du palier courant + échéance de
 * renouvellement, et raccourci vers la page Tarifs. Lecture seule (le palier se
 * change via Paystack sur /app/tarifs). États gérés : chargement / contenu.
 */
export function SubscriptionSection() {
  const myPlan = useQuery(api.billing.myPlan, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnement</CardTitle>
        <CardDescription>
          Votre palier actuel et son renouvellement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {myPlan === undefined ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    (myPlan?.plan ?? 'free') === 'free' ? 'outline' : 'accent'
                  }
                >
                  {PLAN_LABELS[myPlan?.plan ?? 'free']}
                </Badge>
                {myPlan?.planInterval && (
                  <span className="text-sm text-fg-muted">
                    {myPlan.planInterval === 'annual' ? 'Annuel' : 'Mensuel'}
                  </span>
                )}
                {myPlan?.planRenewsAt && (
                  <span className="assay-meta">
                    renouvellement le{' '}
                    {new Date(myPlan.planRenewsAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            )}
            <p className="mt-1.5 text-sm text-fg-muted">
              {(myPlan?.plan ?? 'free') === 'free'
                ? 'Passez à Pro pour un pipeline et une veille sans limite.'
                : 'Merci de soutenir Filon. Gérez votre palier à tout moment.'}
            </p>
          </div>

          <Button variant="outline" className="shrink-0" asChild>
            <Link to="/app/tarifs">
              <Sparkles className="size-4" />
              Voir les tarifs
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
