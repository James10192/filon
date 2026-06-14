import { Check, Loader2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  PRICING,
  formatXof,
  type Interval,
  type PaidPlan,
} from '~/lib/billing/plan'
import type { PlanCard as PlanCardData } from './plan-catalogue'

/**
 * Carte d'un palier. Affiche prix (assay-mono), arguments, et le CTA adapté :
 * palier courant (désactivé), gratuit (informatif), payant (lance Paystack),
 * équipe (mailto sur devis). Le palier mis en avant prend une bordure accent.
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
  const isPaid = data.key === 'pro' || data.key === 'pro_ai'
  const isTeam = data.key === 'team'
  const price = isPaid
    ? PRICING[data.key as PaidPlan][interval]
    : null

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-[var(--radius-lg)] border bg-surface p-6 shadow-[var(--shadow-card)]',
        data.featured ? 'border-accent' : 'border-border',
      )}
    >
      {data.featured && (
        <Badge variant="accent" className="absolute -top-3 left-6">
          Recommandé
        </Badge>
      )}

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-fg">{data.name}</h3>
        {isCurrent && <Badge variant="outline">Palier actuel</Badge>}
      </div>
      <p className="mt-1 min-h-10 text-sm text-fg-muted">{data.tagline}</p>

      <div className="mt-4 flex items-baseline gap-1.5">
        {isTeam ? (
          <span className="text-2xl font-semibold text-fg">Sur devis</span>
        ) : price === null ? (
          <span className="assay text-3xl font-semibold text-fg">0 XOF</span>
        ) : (
          <>
            <span className="assay text-3xl font-semibold text-fg">
              {formatXof(price)}
            </span>
            <span className="text-sm text-fg-subtle">
              / {interval === 'annual' ? 'an' : 'mois'}
            </span>
          </>
        )}
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {data.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" />
            <span className="text-fg-muted">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 pt-2">
        <PlanCta
          planKey={data.key}
          isCurrent={isCurrent}
          isPaid={isPaid}
          isTeam={isTeam}
          featured={data.featured ?? false}
          pendingPlan={pendingPlan}
          onUpgrade={onUpgrade}
        />
      </div>
    </div>
  )
}

function PlanCta({
  planKey,
  isCurrent,
  isPaid,
  isTeam,
  featured,
  pendingPlan,
  onUpgrade,
}: {
  planKey: PlanCardData['key']
  isCurrent: boolean
  isPaid: boolean
  isTeam: boolean
  featured: boolean
  pendingPlan: PaidPlan | null
  onUpgrade: (plan: PaidPlan) => void
}) {
  if (isCurrent) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Palier actuel
      </Button>
    )
  }
  if (isTeam) {
    return (
      <Button variant="outline" className="w-full" asChild>
        <a href="mailto:contact@filon.ci?subject=Filon%20%C3%89quipe">
          Nous contacter
        </a>
      </Button>
    )
  }
  if (!isPaid) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Gratuit
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
      Passer à {planKey === 'pro' ? 'Pro' : 'Pro+ IA'}
    </Button>
  )
}
