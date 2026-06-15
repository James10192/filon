import { v } from 'convex/values'
import { action, internalAction } from './_generated/server'
import { requireUserFromAction } from './lib/withUser'
import { priceXof, toPaystackSubunit, type Interval, type PaidPlan } from './lib/pricing'

/**
 * Domaine paystack · renouvellement (test mode).
 *
 * Séparé de `paystack.ts` (checkout initial) pour ne pas en faire un god file :
 * ici vivent les appels réseau SPÉCIFIQUES au renouvellement d'abonnement.
 *
 *  - `chargeAuthorization` (internalAction) : auto-débit SILENCIEUX d'une carte
 *    réutilisable via POST /charge/authorization. Déclenché par le cron ~48h
 *    avant échéance. Le mobile money n'a PAS d'autorisation réutilisable : il
 *    n'arrive jamais ici (le cron ne sélectionne que les users avec carte).
 *  - `createRenewalLink` (action) : génère une transaction Paystack PRÉ-REMPLIE
 *    (plan + montant courants du user) pour re-payer en 1 clic depuis un lien,
 *    par carte ou mobile money. Sert de fallback quand l'auto-débit échoue ou
 *    quand le user paie en mobile money.
 *
 * La clé secrète vit uniquement dans `PAYSTACK_SECRET_KEY` (jamais committée).
 */

const PAYSTACK_BASE = 'https://api.paystack.co'

const paidPlanValidator = v.union(
  v.literal('pro'),
  v.literal('pro_ai'),
  v.literal('copilot'),
)
const intervalValidator = v.union(v.literal('monthly'), v.literal('annual'))

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) {
    throw new Error('Paiement indisponible : PAYSTACK_SECRET_KEY non configurée.')
  }
  return key
}

function appBaseUrl(): string {
  return process.env.SITE_URL ?? 'http://localhost:3000'
}

type ChargeResponse = {
  status: boolean
  message: string
  data?: { status?: string; reference?: string }
}

/**
 * `internal.paystackRenewal.chargeAuthorization` : débite une carte réutilisable
 * pour le compte d'un renouvellement. Renvoie `{ ok }` sans throw réseau (le cron
 * gère les compteurs de tentative). `status === 'success'` = débit accepté ;
 * tout le reste (failed/abandoned/pending/erreur HTTP) = échec → relance.
 *
 * Le user est résolu/écrit par le cron via mutations : ici on ne fait QUE l'appel
 * Paystack (séparation action réseau / écriture DB).
 */
export const chargeAuthorization = internalAction({
  args: {
    email: v.string(),
    authorizationCode: v.string(),
    amountXof: v.number(),
  },
  handler: async (_ctx, args): Promise<{ ok: boolean; reference: string | null }> => {
    try {
      const res = await fetch(`${PAYSTACK_BASE}/transaction/charge_authorization`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: args.email,
          authorization_code: args.authorizationCode,
          // XOF × 100 (exigence Paystack, devise pourtant zéro décimale).
          amount: toPaystackSubunit(args.amountXof),
          currency: 'XOF',
        }),
      })
      const json = (await res.json()) as ChargeResponse
      const ok = res.ok && json.status === true && json.data?.status === 'success'
      return { ok, reference: json.data?.reference ?? null }
    } catch {
      // Réseau / parsing : traité comme un échec de débit (relance).
      return { ok: false, reference: null }
    }
  },
})

type InitResponse = {
  status: boolean
  message: string
  data?: { authorization_url: string; reference: string }
}

/**
 * `api.paystackRenewal.createRenewalLink` : initialise une transaction Paystack
 * PRÉ-REMPLIE pour renouveler. Par défaut, reprend `plan`/`interval` passés (ou
 * le palier courant du user côté UI). Renvoie l'`authorization_url` à ouvrir : le
 * user re-paie en 1 clic, par carte (réactive l'auto-débit) ou mobile money.
 */
export const createRenewalLink = action({
  args: { plan: paidPlanValidator, interval: intervalValidator },
  handler: async (
    ctx,
    args,
  ): Promise<{ authorizationUrl: string; reference: string }> => {
    const { userId, email } = await requireUserFromAction(ctx)
    if (!email) {
      throw new Error('E-mail introuvable : impossible de générer le lien.')
    }
    const plan = args.plan as PaidPlan
    const interval = args.interval as Interval
    const amountXof = priceXof(plan, interval)

    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: toPaystackSubunit(amountXof),
        currency: 'XOF',
        channels: ['card', 'mobile_money'],
        callback_url: `${appBaseUrl()}/app/tarifs?paystack=return`,
        metadata: { userId, kind: 'subscription', plan, interval, amountXof, renewal: true },
      }),
    })
    const json = (await res.json()) as InitResponse
    if (!res.ok || !json.status || !json.data) {
      throw new Error(
        `Initialisation du lien de renouvellement échouée : ${json.message ?? res.statusText}`,
      )
    }
    return {
      authorizationUrl: json.data.authorization_url,
      reference: json.data.reference,
    }
  },
})
