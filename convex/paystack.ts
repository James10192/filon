import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal } from './_generated/api'
import { requireUserFromAction } from './lib/withUser'
import {
  priceXof,
  toPaystackSubunit,
  type Interval,
  type PaidPlan,
} from './lib/pricing'

/**
 * Domaine paystack · intégration paiement (test mode).
 *
 * La clé secrète vit UNIQUEMENT côté serveur, dans la variable d'env Convex
 * `PAYSTACK_SECRET_KEY` (jamais committée, jamais exposée au client). Tout
 * appel à l'API Paystack part d'ici.
 *
 * Décisions métier vérifiées dans la doc Paystack (juin 2026) :
 * - MONTANT XOF : multiplier par 100 même si le XOF n'a pas de sous-unité
 *   (exigence Paystack). Centralisé dans `toPaystackSubunit`.
 * - RÉCURRENCE : les vraies souscriptions Paystack (Plans + autorisation
 *   réutilisable) sont CARTE uniquement (et Direct Debit Nigeria). Le mobile
 *   money (Wave / Orange Money / MoMo) ne donne PAS d'autorisation
 *   réutilisable → pas d'auto-renouvellement. On expose donc les deux canaux
 *   (`card` + `mobile_money`) : si l'utilisateur paie par carte, le webhook
 *   `subscription.create` activera un vrai abonnement récurrent ; s'il paie par
 *   mobile money, c'est un paiement ponctuel couvrant la période choisie (mois
 *   ou an), avec relance de ré-abonnement à l'échéance. La copie de la page
 *   Tarifs et du retour reflète honnêtement ce comportement.
 */

const PAYSTACK_BASE = 'https://api.paystack.co'

const paidPlanValidator = v.union(v.literal('pro'), v.literal('pro_ai'))
const intervalValidator = v.union(
  v.literal('monthly'),
  v.literal('annual'),
)

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) {
    throw new Error(
      'Paiement indisponible : PAYSTACK_SECRET_KEY non configurée.',
    )
  }
  return key
}

/** URL de base de l'app, pour construire le `callback_url` de retour. */
function appBaseUrl(): string {
  return process.env.SITE_URL ?? 'http://localhost:3000'
}

type InitResponse = {
  status: boolean
  message: string
  data?: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

/**
 * `api.paystack.startCheckout` : initialise une transaction Paystack et renvoie
 * l'`authorization_url` vers laquelle le client redirige. requireUser garantit
 * l'identité ; userId + plan + interval sont passés en `metadata` pour que le
 * webhook recolle l'abonnement au bon user.
 */
export const startCheckout = action({
  args: { plan: paidPlanValidator, interval: intervalValidator },
  handler: async (
    ctx,
    args,
  ): Promise<{ authorizationUrl: string; reference: string }> => {
    const { userId, email } = await requireUserFromAction(ctx)
    if (!email) {
      throw new Error('E-mail introuvable : impossible de lancer le paiement.')
    }

    const plan = args.plan as PaidPlan
    const interval = args.interval as Interval
    const amountXof = priceXof(plan, interval)

    const body = {
      email,
      // XOF × 100 (exigence Paystack pour une devise pourtant zéro décimale).
      amount: toPaystackSubunit(amountXof),
      currency: 'XOF',
      // Carte (récurrent possible) + mobile money (ponctuel).
      channels: ['card', 'mobile_money'],
      callback_url: `${appBaseUrl()}/app/tarifs?paystack=return`,
      metadata: {
        userId,
        plan,
        interval,
        amountXof,
      },
    }

    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const json = (await res.json()) as InitResponse
    if (!res.ok || !json.status || !json.data) {
      throw new Error(
        `Initialisation Paystack échouée : ${json.message ?? res.statusText}`,
      )
    }

    return {
      authorizationUrl: json.data.authorization_url,
      reference: json.data.reference,
    }
  },
})

type VerifyResponse = {
  status: boolean
  message: string
  data?: {
    status: string // 'success' | 'failed' | ...
    amount: number
    currency: string
    customer?: { email?: string; customer_code?: string }
    metadata?: {
      userId?: string
      plan?: PaidPlan
      interval?: Interval
    }
    authorization?: { authorization_code?: string; reusable?: boolean }
    plan?: string | null
  }
}

/** Calcule l'échéance de période payée (epoch ms) selon l'intervalle. */
function renewsAt(interval: Interval): number {
  const days = interval === 'annual' ? 365 : 30
  return Date.now() + days * 24 * 60 * 60 * 1000
}

/**
 * `api.paystack.verifyCheckout` : appelée au retour sur /app/tarifs?paystack=…
 * Vérifie la transaction côté serveur (source de vérité = Paystack, jamais le
 * client) et, si succès, pose le palier. Le webhook reste la voie principale
 * (idempotente) ; cette vérification donne un retour immédiat à l'utilisateur
 * sans attendre le webhook.
 */
export const verifyCheckout = action({
  args: { reference: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: boolean; plan: PaidPlan | null }> => {
    await requireUserFromAction(ctx)

    const res = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(args.reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey()}` },
      },
    )
    const json = (await res.json()) as VerifyResponse
    if (!res.ok || !json.status || !json.data) {
      return { ok: false, plan: null }
    }
    const data = json.data
    if (data.status !== 'success') return { ok: false, plan: null }

    const plan = data.metadata?.plan ?? null
    const interval = data.metadata?.interval ?? 'monthly'
    const userId = data.metadata?.userId
    if (!plan) return { ok: false, plan: null }

    await ctx.runMutation(internal.billing.applySubscription, {
      ...(userId ? { userId } : {}),
      ...(data.customer?.email ? { email: data.customer.email } : {}),
      plan,
      planInterval: interval,
      planRenewsAt: renewsAt(interval),
      ...(data.authorization?.authorization_code
        ? { subscriptionRef: data.authorization.authorization_code }
        : {}),
      ...(data.customer?.customer_code
        ? { paystackCustomerCode: data.customer.customer_code }
        : {}),
    })

    return { ok: true, plan }
  },
})
