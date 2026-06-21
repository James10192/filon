import type { ReactNode } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  PRICING,
  PLAN_LABELS,
  formatXof,
  type Interval,
  type PaidPlan,
} from '~/lib/billing/plan'
import type { PlanCard as PlanCardData } from './plan-catalogue'

/**
 * Coquille présentationnelle d'un palier, partagée entre la page Tarifs in-app
 * et la section Tarifs publique. Affiche prix (assay-mono), arguments, et reçoit
 * son CTA via `cta` (logique d'upgrade in-app ou lien d'inscription public).
 *
 * Alignement : carte en `flex flex-col h-full`, liste d'arguments `flex-1`, CTA
 * épinglé en bas (`mt-auto`) — toutes les cartes d'une grille `auto-rows-fr`
 * gardent la même hauteur et alignent leurs CTA sur une même ligne.
 */
export function PlanCardShell({
  data,
  interval,
  isCurrent,
  cta,
}: {
  data: PlanCardData
  interval: Interval
  isCurrent?: boolean
  cta: ReactNode
}) {
  const isPaid = data.key !== 'free'
  const price = isPaid ? PRICING[data.key as PaidPlan][interval] : null

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-[var(--radius-lg)] border bg-surface p-6 shadow-[var(--shadow-card)]',
        data.featured ? 'border-accent' : 'border-border',
      )}
    >
      {data.featured && (
        <Badge variant="accent" className="absolute -top-3 left-6">
          {m.app_plan_recommended()}
        </Badge>
      )}

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-fg">{data.name()}</h3>
        {isCurrent && <Badge variant="outline">{m.app_current_plan()}</Badge>}
      </div>
      <p className="mt-1 min-h-10 text-sm text-fg-muted">{data.tagline()}</p>

      <div className="mt-4 flex min-h-9 items-baseline gap-1.5">
        {price === null ? (
          <span className="assay text-3xl font-semibold text-fg">0 XOF</span>
        ) : (
          <>
            <span className="assay text-3xl font-semibold text-fg">
              {formatXof(price)}
            </span>
            <span className="text-sm text-fg-subtle">
              / {interval === 'annual' ? m.app_per_year() : m.app_per_month()}
            </span>
          </>
        )}
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {data.features().map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" />
            <span className="text-fg-muted">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">{cta}</div>
    </div>
  )
}

/**
 * Carte d'un palier (page Tarifs in-app). CTA adapté : palier courant (désactivé),
 * gratuit (informatif), payant (lance Paystack).
 */
export function PlanCard({
  data,
  interval,
  isCurrent,
  pendingPlan,
  onUpgrade,
}: {
  data: PlanCardData
  interval: Interval
  isCurrent: boolean
  pendingPlan: PaidPlan | null
  onUpgrade: (plan: PaidPlan) => void
}) {
  const isPaid = data.key !== 'free'

  return (
    <PlanCardShell
      data={data}
      interval={interval}
      isCurrent={isCurrent}
      cta={
        <PlanCta
          planKey={data.key}
          isCurrent={isCurrent}
          isPaid={isPaid}
          featured={data.featured ?? false}
          pendingPlan={pendingPlan}
          onUpgrade={onUpgrade}
        />
      }
    />
  )
}

function PlanCta({
  planKey,
  isCurrent,
  isPaid,
  featured,
  pendingPlan,
  onUpgrade,
}: {
  planKey: PlanCardData['key']
  isCurrent: boolean
  isPaid: boolean
  featured: boolean
  pendingPlan: PaidPlan | null
  onUpgrade: (plan: PaidPlan) => void
}) {
  if (isCurrent) {
    return (
      <Button variant="outline" className="w-full" disabled>
        {m.app_current_plan()}
      </Button>
    )
  }
  if (!isPaid) {
    return (
      <Button variant="outline" className="w-full" disabled>
        {m.app_free()}
      </Button>
    )
  }
  const plan = planKey as PaidPlan
  const isPending = pendingPlan === plan
  return (
    <Button
      variant={featured ? 'default' : 'outline'}
      className="w-full"
      disabled={pendingPlan !== null}
      onClick={() => onUpgrade(plan)}
    >
      {isPending && <Loader2 className="size-4 animate-spin" />}
      {m.app_upgrade_to({ plan: PLAN_LABELS[plan] })}
    </Button>
  )
}
