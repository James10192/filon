import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { toast } from '~/components/ui/sonner'
import { Skeleton } from '~/components/ui/skeleton'
import type { Interval, PaidPlan, Plan } from '~/lib/billing/plan'
import { PLAN_LABELS } from '~/lib/billing/plan'
import { IntervalToggle } from './interval-toggle'
import { PlanCard } from './plan-card'
import { PlanComparison } from './plan-comparison'
import { PLAN_CARDS } from './plan-catalogue'

/**
 * Orchestrateur de la page Tarifs. Lit le palier courant (api.billing.myPlan),
 * gère le sélecteur mensuel/annuel, et lance le flux Paystack au clic d'upgrade
 * (redirection vers l'authorization_url renvoyée par l'action serveur).
 */
export function PricingPlans() {
  const [interval, setInterval] = useState<Interval>('monthly')
  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null)
  const myPlan = useQuery(api.billing.myPlan, {})
  const startCheckout = useAction(api.paystack.startCheckout)

  const currentPlan: Plan = myPlan?.plan ?? 'free'

  async function onUpgrade(plan: PaidPlan) {
    setPendingPlan(plan)
    try {
      const { authorizationUrl } = await startCheckout({ plan, interval })
      // Redirection vers la page de paiement hébergée Paystack.
      window.location.href = authorizationUrl
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('PAYSTACK_SECRET_KEY')
          ? 'Le paiement n\'est pas encore activé. Réessayez bientôt.'
          : 'Le lancement du paiement a échoué. Réessayez.'
      toast.error(message)
      setPendingPlan(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <CurrentPlanBanner plan={currentPlan} loading={myPlan === undefined} />

      <IntervalToggle value={interval} onChange={setInterval} />

      <div className="grid items-stretch gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLAN_CARDS.map((card, i) => (
          <div
            key={card.key}
            className="reveal h-full"
            style={{ '--reveal-i': i } as React.CSSProperties}
          >
            <PlanCard
              data={card}
              interval={interval}
              isCurrent={card.key === currentPlan}
              pendingPlan={pendingPlan}
              onUpgrade={onUpgrade}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-fg-subtle">
        Paiement par carte ou mobile money (Wave, Orange Money, MTN MoMo). La
        carte active un renouvellement automatique ; le mobile money couvre la
        période choisie, avec une relance de ré-abonnement à l'échéance.
      </p>

      <PlanComparison />
    </div>
  )
}

function CurrentPlanBanner({
  plan,
  loading,
}: {
  plan: Plan
  loading: boolean
}) {
  if (loading) {
    return <Skeleton className="h-12 w-full max-w-md rounded-[var(--radius)]" />
  }
  const label = PLAN_LABELS[plan]
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-surface-2 px-4 py-3 text-sm">
      <span className="text-fg-muted">Votre palier actuel :</span>
      <span className="font-medium text-fg">{label}</span>
      {plan === 'free' && (
        <span className="text-fg-subtle">
          · passez à Pro pour lever les limites.
        </span>
      )}
    </div>
  )
}
