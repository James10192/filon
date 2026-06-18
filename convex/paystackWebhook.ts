import type { GenericActionCtx } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import type { Interval, PaidPlan } from './lib/pricing'

/**
 * Webhook Paystack signé · http action montée sur `/paystack/webhook`.
 *
 * Sécurité : Paystack signe le corps brut avec HMAC-SHA512 en utilisant la clé
 * SECRÈTE (pas de secret webhook distinct — vérifié dans la doc). On recalcule
 * la signature sur le corps BRUT (`await request.text()`, jamais re-sérialisé)
 * et on la compare en temps constant à l'en-tête `x-paystack-signature`.
 * Signature invalide → 401. Sinon on traite l'événement et on répond 200 vite.
 *
 * Deux régimes coexistent (discriminés par `metadata.billingMode`) :
 *  - NATIF (carte → souscription Paystack) : Paystack débite, retente et relance
 *    tout seul. Le cron maison ne touche JAMAIS ces users. Les events
 *    subscription.* / invoice.* pilotent l'état ici.
 *  - MANUEL (mobile money / ponctuel) : paiement couvrant la période, relances et
 *    downgrade gérés par le cron maison. Inchangé.
 *
 * Événements traités :
 *  - subscription.create  → pose billingMode='native' + subscription_code +
 *    email_token + planRenewsAt (next_payment_date). Sauve la carte (affichage).
 *  - charge.success       → credit_pack (inchangé) ; plan natif (data.plan) =
 *    renouvellement → prolonge la période (extendNativePeriod, idempotent) +
 *    notif 'renewal_charged' ; sinon ponctuel mobile money (applySubscription).
 *  - invoice.create       → début de cycle natif : journalisation seule.
 *  - invoice.update        → statut final ; si success, filet idempotent qui
 *    prolonge la période (extendNativePeriod).
 *  - invoice.payment_failed → échec de cycle natif : NE PAS rétrograder
 *    (dunning Paystack) ; pose nativeDunning + notif 'renewal_failed'.
 *  - subscription.not_renew → n'ira pas au prochain cycle : pendingPlan='free' +
 *    autoRenew=false, accès maintenu jusqu'à planRenewsAt (markNotRenew).
 *  - subscription.disable  → fin effective : rétrograde (cancelSubscription),
 *    résolu par subscription_code (indexé), nettoie les références natives.
 */

const hexEncoder = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

/** HMAC-SHA512(rawBody, secret) en hex, via Web Crypto (runtime Convex). */
async function computeSignature(
  rawBody: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  )
  return hexEncoder(sig)
}

/** Comparaison à temps constant (évite les timing attacks). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

type PaystackEvent = {
  event: string
  data?: {
    status?: string
    amount?: number
    customer?: { email?: string; customer_code?: string }
    metadata?: {
      userId?: string
      kind?: 'subscription' | 'credit_pack'
      plan?: PaidPlan
      interval?: Interval
      packId?: string
      credits?: number
      billingMode?: 'native' | 'manual'
    }
    plan?: { plan_code?: string; interval?: string } | string | null
    // Présent sur subscription.* : code d'abonnement + token requis pour
    // disable/enable. Selon l'event, `subscription_code` est aussi à plat.
    subscription?: {
      subscription_code?: string
      email_token?: string
      status?: string
    }
    subscription_code?: string
    email_token?: string
    next_payment_date?: string
    authorization?: {
      authorization_code?: string
      reusable?: boolean
      last4?: string
      bank?: string
      brand?: string
    }
  }
}

/** Récupère le subscription_code, qu'il soit à plat ou imbriqué. */
function subscriptionCode(data: PaystackEvent['data']): string | undefined {
  return data?.subscription_code ?? data?.subscription?.subscription_code
}

/** Récupère l'email_token, qu'il soit à plat ou imbriqué. */
function emailToken(data: PaystackEvent['data']): string | undefined {
  return data?.email_token ?? data?.subscription?.email_token
}

/** Le statut « final » d'un cycle/abonnement (invoice.update / subscription.*). */
function isSuccessStatus(status: string | undefined): boolean {
  return status === 'success' || status === 'paid'
}

/** Identifiants de résolution d'un user pour les webhooks d'abonnement. */
function billingRefs(data: PaystackEvent['data']): {
  subscriptionRef?: string
  paystackCustomerCode?: string
  email?: string
} {
  const out: {
    subscriptionRef?: string
    paystackCustomerCode?: string
    email?: string
  } = {}
  const code = subscriptionCode(data)
  if (code) out.subscriptionRef = code
  if (data?.customer?.customer_code) {
    out.paystackCustomerCode = data.customer.customer_code
  }
  if (data?.customer?.email) out.email = data.customer.email
  return out
}

function intervalFromEvent(
  data: PaystackEvent['data'],
): Interval {
  const meta = data?.metadata?.interval
  if (meta === 'monthly' || meta === 'annual') return meta
  // Plan Paystack: interval annually → annual, sinon mensuel.
  const planInterval =
    typeof data?.plan === 'object' && data?.plan ? data.plan.interval : undefined
  return planInterval === 'annually' ? 'annual' : 'monthly'
}

function renewsAtFrom(
  data: PaystackEvent['data'],
  interval: Interval,
): number {
  if (data?.next_payment_date) {
    const t = Date.parse(data.next_payment_date)
    if (!Number.isNaN(t)) return t
  }
  const days = interval === 'annual' ? 365 : 30
  return Date.now() + days * 24 * 60 * 60 * 1000
}

export const handlePaystackWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.PAYSTACK_SECRET_KEY
  // Sans clé configurée, le webhook ne peut rien vérifier : on no-op en 200
  // pour ne pas faire boucler les relances Paystack (rien à traiter de toute
  // façon tant que la clé n'est pas posée).
  if (!secret) return new Response('ok', { status: 200 })

  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''
  const expected = await computeSignature(rawBody, secret)
  if (!signature || !timingSafeEqual(signature, expected)) {
    return new Response('invalid signature', { status: 401 })
  }

  let event: PaystackEvent
  try {
    event = JSON.parse(rawBody) as PaystackEvent
  } catch {
    return new Response('bad payload', { status: 400 })
  }

  const data = event.data
  const plan = data?.metadata?.plan ?? null
  const kind = data?.metadata?.kind ?? 'subscription'
  // `data.plan` (objet/chaîne) présent = cycle d'une souscription NATIVE.
  const hasNativePlan = !!data?.plan
  const isNativeMode = data?.metadata?.billingMode === 'native' || hasNativePlan

  switch (event.event) {
    case 'subscription.create': {
      // 1er charge carte abouti : Paystack a créé la souscription. On pose le
      // régime NATIF + subscription_code + email_token + l'échéance. Idempotent
      // (applySubscription patch dynamique). Résolution user : metadata.userId
      // puis e-mail.
      if (kind === 'credit_pack') break
      if (!plan) break
      const interval = intervalFromEvent(data)
      const code = subscriptionCode(data)
      const token = emailToken(data)
      await ctx.runMutation(internal.billing.applySubscription, {
        ...(data?.metadata?.userId ? { userId: data.metadata.userId } : {}),
        ...(data?.customer?.email ? { email: data.customer.email } : {}),
        plan,
        planInterval: interval,
        planRenewsAt: renewsAtFrom(data, interval),
        billingMode: 'native',
        ...(code ? { subscriptionRef: code } : {}),
        ...(token ? { subscriptionEmailToken: token } : {}),
        ...(data?.customer?.customer_code
          ? { paystackCustomerCode: data.customer.customer_code }
          : {}),
      })
      // Carte : mémoriser last4/brand pour l'affichage. En natif, Paystack
      // détient le mandat (l'auto-débit cron n'est PAS utilisé), mais on garde
      // ces métadonnées pour l'UI.
      await maybeSaveCard(ctx, data)
      break
    }

    case 'charge.success': {
      // Pack de crédits IA : créditer le packBalance (inchangé).
      if (kind === 'credit_pack') {
        const credits = data?.metadata?.credits ?? 0
        if (credits > 0) {
          await ctx.runMutation(internal.aiCredits.creditPack, {
            ...(data?.metadata?.userId
              ? { userId: data.metadata.userId }
              : {}),
            ...(data?.customer?.email ? { email: data.customer.email } : {}),
            credits,
          })
        }
        break
      }

      if (hasNativePlan) {
        // Renouvellement NATIF piloté par Paystack : prolonger la période. NE
        // PAS déclencher le cron. Idempotent via extendNativePeriod (ne
        // prolonge que vers l'avant). Notif 'renewal_charged'.
        const interval = intervalFromEvent(data)
        const extended = await ctx.runMutation(
          internal.billing.extendNativePeriod,
          {
            ...billingRefs(data),
            ...(plan ? { plan } : {}),
            planInterval: interval,
            nextRenewsAt: renewsAtFrom(data, interval),
          },
        )
        if (extended) {
          await notify(ctx, data, {
            kind: 'renewal_charged',
            title: 'Abonnement renouvelé',
            body: 'Votre abonnement par carte a été renouvelé automatiquement.',
          })
        }
        break
      }

      // Pas de plan natif et mode manuel : paiement PONCTUEL mobile money (ou
      // carte legacy). Comportement actuel : applySubscription en 'manual'.
      if (plan) {
        const interval = intervalFromEvent(data)
        await ctx.runMutation(internal.billing.applySubscription, {
          ...(data?.metadata?.userId ? { userId: data.metadata.userId } : {}),
          ...(data?.customer?.email ? { email: data.customer.email } : {}),
          plan,
          planInterval: interval,
          planRenewsAt: renewsAtFrom(data, interval),
          billingMode: 'manual',
          ...(data?.subscription_code
            ? { subscriptionRef: data.subscription_code }
            : data?.authorization?.authorization_code
              ? { subscriptionRef: data.authorization.authorization_code }
              : {}),
          ...(data?.customer?.customer_code
            ? { paystackCustomerCode: data.customer.customer_code }
            : {}),
        })
        // Carte réutilisable → mémoriser l'autorisation pour l'auto-débit cron
        // (mode manuel legacy). Mobile money : pas de `reusable`, rien stocké.
        const auth = data?.authorization
        if (auth?.authorization_code && auth.reusable === true) {
          await ctx.runMutation(internal.billing.saveCardAuthorization, {
            ...(data?.metadata?.userId
              ? { userId: data.metadata.userId }
              : {}),
            ...(data?.customer?.email ? { email: data.customer.email } : {}),
            authorizationCode: auth.authorization_code,
            ...(auth.last4 ? { last4: auth.last4 } : {}),
            ...(auth.bank ? { bank: auth.bank } : {}),
            ...(auth.brand ? { brand: auth.brand } : {}),
          })
        }
      }
      break
    }

    case 'invoice.create': {
      // Début d'un cycle natif (Paystack tente le débit). Journalisation seule :
      // pas de mutation d'état (le résultat arrive via charge.success /
      // invoice.update / invoice.payment_failed).
      break
    }

    case 'invoice.update': {
      // Statut final du cycle natif. Si success, FILET idempotent : prolonge la
      // période si charge.success ne l'a pas déjà fait (extendNativePeriod ne
      // prolonge que vers l'avant).
      if (!isNativeMode) break
      if (!isSuccessStatus(data?.status)) break
      const interval = intervalFromEvent(data)
      await ctx.runMutation(internal.billing.extendNativePeriod, {
        ...billingRefs(data),
        ...(plan ? { plan } : {}),
        planInterval: interval,
        nextRenewsAt: renewsAtFrom(data, interval),
      })
      break
    }

    case 'invoice.payment_failed': {
      // Échec d'un cycle natif : NE PAS rétrograder (Paystack retente selon sa
      // politique de dunning). Drapeau informatif + notif. Le downgrade effectif
      // viendra de subscription.disable.
      const flagged = await ctx.runMutation(internal.billing.markNativeDunning, {
        ...billingRefs(data),
      })
      if (flagged) {
        await notify(ctx, data, {
          kind: 'renewal_failed',
          title: 'Échec du renouvellement par carte',
          body: 'Le débit de votre abonnement a échoué. Paystack va réessayer. Vérifiez votre carte pour ne pas perdre l’accès.',
        })
      }
      break
    }

    case 'subscription.not_renew': {
      // La souscription native n'ira pas au prochain cycle (annulation côté
      // Paystack ou dunning épuisé). On programme 'free' à l'échéance sans
      // rétrograder tout de suite (accès maintenu jusqu'à planRenewsAt).
      await ctx.runMutation(internal.billing.markNotRenew, {
        ...billingRefs(data),
      })
      break
    }

    case 'subscription.disable': {
      // Fin effective de la souscription native. Rétrograde en 'free' (résolu
      // par subscription_code indexé), nettoie les références natives.
      await ctx.runMutation(internal.billing.cancelSubscription, {
        ...billingRefs(data),
      })
      break
    }

    default:
      // Autres events : pas d'action.
      break
  }

  // 200 rapide : Paystack considère le webhook livré.
  return new Response('ok', { status: 200 })
})

/**
 * Crée une notification in-app pour le user d'un webhook d'abonnement. Résout
 * d'abord l'`authId` (notifications.create exige un userId) : metadata.userId
 * direct, sinon résolution par subscription_code / code client / e-mail. No-op
 * si le user reste introuvable (best-effort : ne casse jamais le 200).
 */
async function notify(
  ctx: GenericActionCtx<DataModel>,
  data: PaystackEvent['data'],
  notif: {
    kind: 'renewal_charged' | 'renewal_failed'
    title: string
    body: string
  },
): Promise<void> {
  let authId = data?.metadata?.userId ?? null
  if (!authId) {
    authId = await ctx.runMutation(internal.billing.resolveAuthId, {
      ...billingRefs(data),
    })
  }
  if (!authId) return
  await ctx.runMutation(internal.notifications.create, {
    userId: authId,
    kind: notif.kind,
    title: notif.title,
    body: notif.body,
    actionUrl: '/app/parametres',
  })
}

/** Mémorise les métadonnées carte (last4/brand) pour l'affichage, best-effort. */
async function maybeSaveCard(
  ctx: GenericActionCtx<DataModel>,
  data: PaystackEvent['data'],
): Promise<void> {
  const auth = data?.authorization
  if (!auth?.authorization_code) return
  await ctx.runMutation(internal.billing.saveCardAuthorization, {
    ...(data?.metadata?.userId ? { userId: data.metadata.userId } : {}),
    ...(data?.customer?.email ? { email: data.customer.email } : {}),
    authorizationCode: auth.authorization_code,
    ...(auth.last4 ? { last4: auth.last4 } : {}),
    ...(auth.bank ? { bank: auth.bank } : {}),
    ...(auth.brand ? { brand: auth.brand } : {}),
  })
}
