import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { toast } from '~/components/ui/sonner'
import { PageToolbar } from '~/components/app/page-toolbar'
import { PricingPlans } from '~/components/billing/pricing-plans'

/**
 * Page Tarifs : grille mensuel / annuel (XOF), comparatif des paliers,
 * indicateur du palier courant et CTA d'upgrade qui lance le flux Paystack.
 *
 * Au retour de Paystack (`?paystack=return&reference=…`), on vérifie la
 * transaction côté serveur (source de vérité) puis on nettoie l'URL.
 */
export const Route = createFileRoute('/app/tarifs')({
  component: TarifsPage,
  head: () => ({ meta: [{ title: m.app_tarifs_page_title() }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { paystack?: string; reference?: string; trxref?: string } => {
    const out: { paystack?: string; reference?: string; trxref?: string } = {}
    if (typeof search.paystack === 'string') out.paystack = search.paystack
    if (typeof search.reference === 'string') out.reference = search.reference
    if (typeof search.trxref === 'string') out.trxref = search.trxref
    return out
  },
})

function TarifsPage() {
  const { paystack, reference, trxref } = Route.useSearch()
  const navigate = useNavigate()
  const verify = useAction(api.paystack.verifyCheckout)

  // Retour Paystack : Paystack renvoie `reference` (et/ou `trxref`).
  useEffect(() => {
    if (paystack !== 'return') return
    const ref = reference ?? trxref
    void (async () => {
      if (ref) {
        try {
          const res = await verify({ reference: ref })
          if (res.ok) {
            toast.success(m.app_tarifs_payment_confirmed())
          } else {
            toast.error(m.app_tarifs_payment_unconfirmed())
          }
        } catch {
          toast.error(m.app_tarifs_payment_verify_error())
        }
      }
      void navigate({ to: '/app/tarifs', replace: true })
    })()
    // On ne dépend que des params d'URL : un seul passage au retour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paystack, reference, trxref])

  return (
    <div className="flex flex-col">
      <PageToolbar
        title={m.app_tarifs_title()}
        subtitle={m.app_tarifs_subtitle()}
      />
      <PricingPlans />
    </div>
  )
}
