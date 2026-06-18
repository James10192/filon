import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { CreditCard, Smartphone } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import { Skeleton } from '~/components/ui/skeleton'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  PRICING,
  PLAN_LABELS,
  formatXof,
  type Interval,
  type PaidPlan,
  type Plan,
} from '~/lib/billing/plan'
import { IntervalToggle } from './interval-toggle'
import { PlanCard } from './plan-card'
import { PlanComparison } from './plan-comparison'
import { PLAN_CARDS } from './plan-catalogue'

/**
 * Orchestrateur de la page Tarifs. Lit le palier courant (api.billing.myPlan),
 * gère le sélecteur mensuel/annuel, et lance le flux Paystack au clic d'upgrade.
 *
 * Deux intentions de paiement explicites (le clic ouvre un choix de canal) :
 *  - CARTE → souscription Paystack récurrente (auto-renouvellement géré par
 *    Paystack). `recurring: true`.
 *  - MOBILE MONEY → paiement ponctuel couvrant la période, relance à l'échéance.
 *    `recurring: false`.
 */
export function PricingPlans() {
  const [interval, setInterval] = useState<Interval>('monthly')
  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null)
  // Palier en attente de choix de canal (dialog ouvert). null = dialog fermé.
  const [choicePlan, setChoicePlan] = useState<PaidPlan | null>(null)
  const myPlan = useQuery(api.billing.myPlan, {})
  const startCheckout = useAction(api.paystack.startCheckout)

  const currentPlan: Plan = myPlan?.plan ?? 'free'

  /** Lance Paystack pour le palier choisi, selon le canal (carte vs mobile). */
  async function launch(plan: PaidPlan, recurring: boolean) {
    setChoicePlan(null)
    setPendingPlan(plan)
    try {
      const { authorizationUrl } = await startCheckout({
        plan,
        interval,
        recurring,
      })
      // Redirection vers la page de paiement hébergée Paystack.
      window.location.href = authorizationUrl
    } catch (error) {
      toast.error(
        errorMessage(error, m.app_checkout_error()),
      )
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
              onUpgrade={(plan) => setChoicePlan(plan)}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-fg-subtle">
        {m.app_payment_methods_hint()}
      </p>

      <PlanComparison />

      <PaymentChannelDialog
        plan={choicePlan}
        interval={interval}
        open={choicePlan !== null}
        onOpenChange={(o) => !o && setChoicePlan(null)}
        onChoose={launch}
      />
    </div>
  )
}

/**
 * Choix du canal de paiement (les deux intentions explicites du blueprint). Le
 * canal détermine le régime : carte → souscription récurrente Paystack ; mobile
 * money → paiement ponctuel + relance à l'échéance. Mobile-first : options
 * empilées, cibles tactiles >= h-11.
 */
function PaymentChannelDialog({
  plan,
  interval,
  open,
  onOpenChange,
  onChoose,
}: {
  plan: PaidPlan | null
  interval: Interval
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (plan: PaidPlan, recurring: boolean) => void
}) {
  if (!plan) return null
  const price = formatXof(PRICING[plan][interval])
  const per = interval === 'annual' ? m.app_per_year() : m.app_per_month()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.app_upgrade_to({ plan: PLAN_LABELS[plan] })}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            <span className="assay font-medium text-fg">{price}</span> / {per}.
            {' '}{m.app_choose_payment_method()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onChoose(plan, true)}
            className="flex min-h-11 items-start gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <CreditCard className="mt-0.5 size-5 shrink-0 text-accent" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-fg">{m.app_payment_card()}</span>
              <span className="text-xs leading-relaxed text-fg-muted">
                {m.app_payment_card_desc()}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChoose(plan, false)}
            className="flex min-h-11 items-start gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <Smartphone className="mt-0.5 size-5 shrink-0 text-accent" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-fg">
                {m.app_payment_mobile()}
              </span>
              <span className="text-xs leading-relaxed text-fg-muted">
                {m.app_payment_mobile_desc()}
              </span>
            </span>
          </button>
        </div>

        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {m.app_cancel()}
        </Button>
      </DialogContent>
    </Dialog>
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
      <span className="text-fg-muted">{m.app_current_plan_label()}</span>
      <span className="font-medium text-fg">{label}</span>
      {plan === 'free' && (
        <span className="text-fg-subtle">
          {m.app_current_plan_free_hint()}
        </span>
      )}
    </div>
  )
}
