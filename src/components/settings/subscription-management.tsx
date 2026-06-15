import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import {
  ArrowDownRight,
  CreditCard,
  RotateCcw,
  Smartphone,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import type { PaidPlan, Interval } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
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
import { PLAN_LABELS, type Plan } from '~/lib/billing/plan'
import { SubscriptionConfirmDialog } from './subscription-confirm-dialog'
import { dialogCopy, type LifecycleDialog } from './subscription-dialog-copy'

/** Formate une échéance epoch ms en date FR longue. */
function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Section « Gérer mon abonnement » : palier courant, échéance, renouvellement,
 * downgrade ou annulation programmés, et actions du cycle de vie. États gérés
 * (chargement / contenu / erreur via toast). Toute action destructive passe par
 * un AlertDialog de confirmation.
 */
export function SubscriptionManagement() {
  const myPlan = useQuery(api.billing.myPlan, {})
  const scheduleDowngrade = useMutation(api.billing.scheduleDowngrade)
  const cancelAutoRenew = useMutation(api.billing.cancelAutoRenew)
  const reactivate = useMutation(api.billing.reactivateAutoRenew)
  const createRenewalLink = useAction(api.paystackRenewal.createRenewalLink)

  const [dialog, setDialog] = useState<LifecycleDialog | null>(null)
  const [pending, setPending] = useState(false)
  const [renewing, setRenewing] = useState(false)

  async function run(action: () => Promise<unknown>, ok: string) {
    setPending(true)
    try {
      await action()
      toast.success(ok)
      setDialog(null)
    } catch {
      toast.error('Action impossible pour le moment. Réessayez.')
    } finally {
      setPending(false)
    }
  }

  const plan: Plan = myPlan?.plan ?? 'free'
  const isFree = plan === 'free'
  const renewsAt = myPlan?.planRenewsAt ?? null
  const renewsLabel = renewsAt ? formatDate(renewsAt) : null
  const autoRenew = myPlan?.autoRenew ?? true
  const pendingPlan = myPlan?.pendingPlan ?? null
  const card = myPlan?.card ?? null
  const interval: Interval = myPlan?.planInterval === 'annual' ? 'annual' : 'monthly'

  /** Génère un lien Paystack pré-rempli puis redirige le navigateur dessus. */
  async function renewNow() {
    if (isFree) return
    setRenewing(true)
    try {
      const { authorizationUrl } = await createRenewalLink({
        plan: plan as PaidPlan,
        interval,
      })
      window.location.href = authorizationUrl
    } catch {
      toast.error(m.renewal_error())
      setRenewing(false)
    }
  }

  function confirmDialog() {
    if (!dialog) return
    const copy = dialogCopy(dialog, renewsLabel)
    void run(
      () =>
        dialog === 'cancel'
          ? cancelAutoRenew({})
          : scheduleDowngrade({ target: 'pro' }),
      copy.success,
    )
  }

  const copy = dialog ? dialogCopy(dialog, renewsLabel) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gérer mon abonnement</CardTitle>
        <CardDescription>
          Palier, renouvellement et changements programmés.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {myPlan == null ? (
          <Skeleton className="h-24 w-full rounded-[var(--radius)]" />
        ) : (
          <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isFree ? 'outline' : 'accent'}>
                {PLAN_LABELS[plan]}
              </Badge>
              {myPlan.planInterval && (
                <span className="text-sm text-fg-muted">
                  {myPlan.planInterval === 'annual' ? 'Annuel' : 'Mensuel'}
                </span>
              )}
              {!isFree && !autoRenew && (
                <Badge variant="outline">Renouvellement coupé</Badge>
              )}
            </div>

            {renewsLabel && (
              <p className="text-sm text-fg-muted">
                {autoRenew && !pendingPlan
                  ? 'Période payée jusqu’au '
                  : 'Accès maintenu jusqu’au '}
                <span className="assay">{renewsLabel}</span>
              </p>
            )}

            {pendingPlan && renewsLabel && (
              <p className="rounded-[var(--radius)] bg-accent-soft px-3 py-2 text-sm text-accent">
                {pendingPlan === 'free'
                  ? 'Repasse en Découverte le '
                  : `Passe à ${PLAN_LABELS[pendingPlan]} le `}
                <span className="assay">{renewsLabel}</span>
              </p>
            )}

            {isFree && (
              <p className="text-sm text-fg-muted">
                Vous êtes sur le palier gratuit. Passez à Pro pour lever les
                limites.
              </p>
            )}

            {!isFree && (
              <div className="mt-1 flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5">
                {card ? (
                  <CreditCard className="size-4 shrink-0 text-fg-muted" />
                ) : (
                  <Smartphone className="size-4 shrink-0 text-fg-muted" />
                )}
                <div className="flex-1">
                  {card ? (
                    <>
                      <p className="text-sm font-medium text-fg">
                        {card.brand ? `${card.brand} ` : ''}···· {card.last4}
                        {card.bank ? ` · ${card.bank}` : ''}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {m.renewal_card_auto()}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-fg-muted">
                      {m.renewal_no_card()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant={isFree ? 'default' : 'outline'} asChild>
            <Link to="/app/tarifs">
              <Sparkles className="size-4" />
              {isFree ? 'Choisir un palier' : 'Changer de palier'}
            </Link>
          </Button>

          {!isFree && (
            <Button onClick={() => void renewNow()} disabled={renewing}>
              <RotateCcw className="size-4" />
              {m.renewal_renew_now()}
            </Button>
          )}

          {plan === 'pro_ai' && pendingPlan !== 'pro' && pendingPlan !== 'free' && (
            <Button variant="outline" onClick={() => setDialog('downgrade')}>
              <ArrowDownRight className="size-4" />
              Programmer Pro
            </Button>
          )}

          {!isFree && autoRenew && (
            <Button variant="ghost" onClick={() => setDialog('cancel')}>
              <XCircle className="size-4" />
              Annuler le renouvellement
            </Button>
          )}

          {!isFree && (!autoRenew || pendingPlan) && (
            <Button
              variant="outline"
              onClick={() =>
                run(() => reactivate({}), 'Renouvellement réactivé.')
              }
              disabled={pending}
            >
              <RotateCcw className="size-4" />
              Réactiver
            </Button>
          )}
        </div>
      </CardContent>

      <SubscriptionConfirmDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        title={copy?.title ?? ''}
        description={copy?.description ?? null}
        actionLabel={copy?.actionLabel ?? ''}
        pending={pending}
        onConfirm={confirmDialog}
      />
    </Card>
  )
}
