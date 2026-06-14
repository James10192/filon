import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
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
 * Événements traités :
 *  - charge.success / subscription.create → pose le palier (applySubscription)
 *  - subscription.disable / subscription.not_renew → rétrograde (cancelSubscription)
 *  - invoice.payment_failed → on ne rétrograde pas immédiatement (Paystack
 *    retente) ; journalisé seulement.
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
    customer?: { email?: string; customer_code?: string }
    metadata?: { userId?: string; plan?: PaidPlan; interval?: Interval }
    plan?: { plan_code?: string; interval?: string } | string | null
    subscription_code?: string
    next_payment_date?: string
    authorization?: { authorization_code?: string; reusable?: boolean }
  }
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

  switch (event.event) {
    case 'charge.success':
    case 'subscription.create': {
      if (plan) {
        const interval = intervalFromEvent(data)
        await ctx.runMutation(internal.billing.applySubscription, {
          ...(data?.metadata?.userId ? { userId: data.metadata.userId } : {}),
          ...(data?.customer?.email ? { email: data.customer.email } : {}),
          plan,
          planInterval: interval,
          planRenewsAt: renewsAtFrom(data, interval),
          ...(data?.subscription_code
            ? { subscriptionRef: data.subscription_code }
            : data?.authorization?.authorization_code
              ? { subscriptionRef: data.authorization.authorization_code }
              : {}),
          ...(data?.customer?.customer_code
            ? { paystackCustomerCode: data.customer.customer_code }
            : {}),
        })
      }
      break
    }
    case 'subscription.disable':
    case 'subscription.not_renew': {
      await ctx.runMutation(internal.billing.cancelSubscription, {
        ...(data?.subscription_code
          ? { subscriptionRef: data.subscription_code }
          : {}),
        ...(data?.customer?.customer_code
          ? { paystackCustomerCode: data.customer.customer_code }
          : {}),
        ...(data?.customer?.email ? { email: data.customer.email } : {}),
      })
      break
    }
    default:
      // invoice.create / invoice.update / invoice.payment_failed et autres :
      // pas d'action immédiate. Paystack retente les paiements échoués ; on ne
      // rétrograde que sur subscription.disable.
      break
  }

  // 200 rapide : Paystack considère le webhook livré.
  return new Response('ok', { status: 200 })
})
