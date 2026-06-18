import { v, ConvexError } from 'convex/values'
import type { GenericActionCtx } from 'convex/server'
import { action } from './_generated/server'
import { internal } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import { requireUserFromAction } from './lib/withUser'
import {
  creditPackById,
  priceXof,
  toPaystackSubunit,
  type Interval,
  type PaidPlan,
} from './lib/pricing'
import { planCodeFor } from './lib/paystackPlans'

/** Erreur métier de facturation typée : traverse jusqu'au client (sinon en
 * prod Convex masque le message des `Error` brutes en « Server Error »). */
function billingError(message: string): ConvexError<{ kind: 'BILLING'; message: string }> {
  return new ConvexError({ kind: 'BILLING', message })
}

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

const paidPlanValidator = v.union(
  v.literal('pro'),
  v.literal('pro_ai'),
  v.literal('copilot'),
)
const intervalValidator = v.union(
  v.literal('monthly'),
  v.literal('annual'),
)
const kindValidator = v.union(
  v.literal('subscription'),
  v.literal('credit_pack'),
)

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) {
    throw billingError(
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
  args: {
    // `kind` défaut 'subscription' (rétrocompatible). Pour un abonnement, `plan`
    // + `interval` sont requis ; pour un pack de crédits, `packId` est requis.
    kind: v.optional(kindValidator),
    plan: v.optional(paidPlanValidator),
    interval: v.optional(intervalValidator),
    packId: v.optional(v.string()),
    // Canal d'intention choisi côté UI (page Tarifs) :
    //  - true (défaut abonnement) : CARTE → souscription native Paystack
    //    récurrente, SI les Plans sont provisionnés (sinon retombe sur ponctuel).
    //  - false : MOBILE MONEY → paiement PONCTUEL (aucune autorisation
    //    réutilisable, donc jamais de plan_code transmis).
    recurring: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ authorizationUrl: string; reference: string }> => {
    const { userId, email } = await requireUserFromAction(ctx)
    if (!email) {
      throw billingError(
        'E-mail introuvable : impossible de lancer le paiement.',
      )
    }

    const kind = args.kind ?? 'subscription'

    // --- Pack de crédits : strictement PONCTUEL, inchangé. ---
    if (kind === 'credit_pack') {
      if (!args.packId) throw billingError('Pack de crédits manquant.')
      const pack = creditPackById(args.packId)
      if (!pack) throw billingError('Pack de crédits inconnu.')
      const body = {
        email,
        amount: toPaystackSubunit(pack.priceXof),
        currency: 'XOF',
        channels: ['card', 'mobile_money'],
        callback_url: `${appBaseUrl()}/app/tarifs?paystack=return`,
        metadata: {
          userId,
          kind: 'credit_pack',
          packId: pack.id,
          credits: pack.credits,
          amountXof: pack.priceXof,
          billingMode: 'manual',
        },
      }
      return initializeTransaction(body)
    }

    // --- Abonnement : natif (carte) vs ponctuel (mobile money). ---
    if (!args.plan || !args.interval) {
      throw billingError('Palier ou intervalle manquant.')
    }
    const plan = args.plan as PaidPlan
    const interval = args.interval as Interval
    const amountXof = priceXof(plan, interval)

    // Carte récurrente demandée ET Plans provisionnés → souscription NATIVE.
    const recurring = args.recurring ?? true
    const planCode = recurring
      ? planCodeFor(
          await ctx.runQuery(internal.paystackPlans.planCodeMap, {}),
          plan,
          interval,
        )
      : null

    if (planCode) {
      // Mode NATIF : on passe `plan` (Paystack prend le montant du plan, on
      // n'envoie donc PAS `amount`) et on force `channels: ['card']` (le mobile
      // money ne peut pas porter un mandat récurrent). Le webhook
      // `subscription.create` posera billingMode='native' + subscription_code.
      const body = {
        email,
        plan: planCode,
        channels: ['card'],
        callback_url: `${appBaseUrl()}/app/tarifs?paystack=return`,
        metadata: {
          userId,
          kind: 'subscription',
          plan,
          interval,
          amountXof,
          billingMode: 'native',
        },
      }
      return initializeTransaction(body)
    }

    // Mode PONCTUEL (mobile money, recurring=false, ou Plans non provisionnés) :
    // comportement actuel conservé. Si les Plans ne sont pas provisionnés, on
    // garde les deux canaux pour ne pas bloquer l'achat en test-mode.
    const body = {
      email,
      // XOF × 100 (exigence Paystack pour une devise pourtant zéro décimale).
      amount: toPaystackSubunit(amountXof),
      currency: 'XOF',
      channels: recurring ? ['card', 'mobile_money'] : ['mobile_money'],
      callback_url: `${appBaseUrl()}/app/tarifs?paystack=return`,
      metadata: {
        userId,
        kind: 'subscription',
        plan,
        interval,
        amountXof,
        billingMode: 'manual',
      },
    }
    return initializeTransaction(body)
  },
})

/** Initialise une transaction Paystack et renvoie l'`authorization_url`. */
async function initializeTransaction(
  body: Record<string, unknown>,
): Promise<{ authorizationUrl: string; reference: string }> {
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
    throw billingError(
      `Initialisation Paystack échouée : ${json.message ?? res.statusText}`,
    )
  }
  return {
    authorizationUrl: json.data.authorization_url,
    reference: json.data.reference,
  }
}

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
      kind?: 'subscription' | 'credit_pack'
      plan?: PaidPlan
      interval?: Interval
      packId?: string
      credits?: number
    }
    authorization?: {
      authorization_code?: string
      reusable?: boolean
      last4?: string
      bank?: string
      brand?: string
    }
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
  ): Promise<{
    ok: boolean
    kind: 'subscription' | 'credit_pack' | null
    plan: PaidPlan | null
    credits: number | null
  }> => {
    await requireUserFromAction(ctx)

    const res = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(args.reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey()}` },
      },
    )
    const json = (await res.json()) as VerifyResponse
    if (!res.ok || !json.status || !json.data) {
      return { ok: false, kind: null, plan: null, credits: null }
    }
    const data = json.data
    if (data.status !== 'success') {
      return { ok: false, kind: null, plan: null, credits: null }
    }

    const userId = data.metadata?.userId
    const kind = data.metadata?.kind ?? 'subscription'

    if (kind === 'credit_pack') {
      const credits = data.metadata?.credits ?? 0
      if (credits <= 0) {
        return { ok: false, kind: 'credit_pack', plan: null, credits: null }
      }
      await ctx.runMutation(internal.aiCredits.creditPack, {
        ...(userId ? { userId } : {}),
        ...(data.customer?.email ? { email: data.customer.email } : {}),
        credits,
      })
      return { ok: true, kind: 'credit_pack', plan: null, credits }
    }

    const plan = data.metadata?.plan ?? null
    const interval = data.metadata?.interval ?? 'monthly'
    if (!plan) {
      return { ok: false, kind: 'subscription', plan: null, credits: null }
    }

    // Au retour immédiat, on confirme le palier en mode 'manual' (paiement
    // ponctuel : c'est le retour client, source de vérité = vérification API).
    // Si le paiement était une souscription NATIVE (carte), le webhook
    // `subscription.create` réécrira billingMode='native' + subscription_code +
    // email_token quand Paystack l'émettra : applySubscription est idempotent et
    // ne dégrade jamais un user déjà passé en 'native'.
    await ctx.runMutation(internal.billing.applySubscription, {
      ...(userId ? { userId } : {}),
      ...(data.customer?.email ? { email: data.customer.email } : {}),
      plan,
      planInterval: interval,
      planRenewsAt: renewsAt(interval),
      billingMode: 'manual',
      ...(data.authorization?.authorization_code
        ? { subscriptionRef: data.authorization.authorization_code }
        : {}),
      ...(data.customer?.customer_code
        ? { paystackCustomerCode: data.customer.customer_code }
        : {}),
    })

    // Carte réutilisable → mémoriser l'autorisation pour l'auto-débit du cron.
    // Le mobile money n'expose PAS d'autorisation réutilisable : on ne stocke
    // alors rien (paiement ponctuel, relance à l'échéance).
    await maybeSaveCardAuthorization(ctx, data, userId)

    return { ok: true, kind: 'subscription', plan, credits: null }
  },
})

type PaystackAuthorization = {
  authorization_code?: string
  reusable?: boolean
  last4?: string
  bank?: string
  brand?: string
}

/**
 * Stocke l'autorisation carte SI elle est réutilisable. Factorisé pour être
 * réutilisé par le webhook. No-op silencieux pour le mobile money (pas de
 * `reusable`), sans jamais throw (la sauvegarde carte ne doit pas casser la
 * confirmation de paiement).
 */
async function maybeSaveCardAuthorization(
  ctx: GenericActionCtx<DataModel>,
  data: { authorization?: PaystackAuthorization; customer?: { email?: string } },
  userId: string | undefined,
): Promise<void> {
  const auth = data.authorization
  if (!auth?.authorization_code || auth.reusable !== true) return
  try {
    await ctx.runMutation(internal.billing.saveCardAuthorization, {
      ...(userId ? { userId } : {}),
      ...(data.customer?.email ? { email: data.customer.email } : {}),
      authorizationCode: auth.authorization_code,
      ...(auth.last4 ? { last4: auth.last4 } : {}),
      ...(auth.bank ? { bank: auth.bank } : {}),
      ...(auth.brand ? { brand: auth.brand } : {}),
    })
  } catch {
    // Best-effort : ne pas faire échouer la vérification de paiement.
  }
}
