import { v, ConvexError } from 'convex/values'
import type { GenericActionCtx } from 'convex/server'
import { action, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import { requireUserFromAction } from './lib/withUser'

/**
 * Souscriptions Paystack natives · gestion (disable / enable / manage link).
 *
 * Séparé de `paystack.ts` (checkout) et `paystackRenewal.ts` (mode manuel) pour
 * éviter le god file : ici vivent les appels réseau SPÉCIFIQUES à la gestion
 * d'une souscription NATIVE (carte). Réservé aux users `billingMode === 'native'`.
 *
 *  - `disableSubscription` : remplaçant natif de `billing.cancelAutoRenew`.
 *    POST /subscription/disable { code, token }. On NE rétrograde PAS localement :
 *    le webhook subscription.disable / not_renew fait foi (source de vérité =
 *    Paystack). Optionnel : flag autoRenew=false pour un retour UI immédiat.
 *  - `enableSubscription` : remplaçant natif de `billing.reactivateAutoRenew`.
 *    POST /subscription/enable { code, token }.
 *  - `manageLink` : GET /subscription/:code/manage/link → lien hébergé Paystack
 *    où le user gère sa carte / annule. Fallback « Gérer mon abonnement » quand
 *    l'email_token est absent (souscription pré-migration).
 *
 * La clé secrète vit uniquement dans `PAYSTACK_SECRET_KEY` (jamais committée).
 */

const PAYSTACK_BASE = 'https://api.paystack.co'

/** Erreur métier de facturation typée (traverse jusqu'au client en prod). */
function billingError(message: string): ConvexError<{ kind: 'BILLING'; message: string }> {
  return new ConvexError({ kind: 'BILLING', message })
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) {
    throw billingError('Paiement indisponible : PAYSTACK_SECRET_KEY non configurée.')
  }
  return key
}

/**
 * `internal.paystackSubscription.nativeRefs` : lit (subscriptionRef,
 * subscriptionEmailToken, billingMode) du user courant. Une query (lecture DB)
 * car une action ne peut pas toucher `ctx.db` directement.
 */
export const nativeRefs = internalQuery({
  args: { authId: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    billingMode: 'native' | 'manual'
    subscriptionRef: string | null
    emailToken: string | null
  } | null> => {
    const doc = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', args.authId))
      .unique()
    if (!doc) return null
    return {
      billingMode: doc.billingMode === 'native' ? 'native' : 'manual',
      subscriptionRef: doc.subscriptionRef ?? null,
      emailToken: doc.subscriptionEmailToken ?? null,
    }
  },
})

type SimpleResponse = { status?: boolean; message?: string }
type ManageLinkResponse = {
  status?: boolean
  message?: string
  data?: { link?: string }
}

/** Charge les références natives du user courant ou throw un message clair. */
async function requireNative(
  ctx: GenericActionCtx<DataModel>,
): Promise<{ code: string; token: string }> {
  const { userId } = await requireUserFromAction(ctx)
  const refs = await ctx.runQuery(internal.paystackSubscription.nativeRefs, {
    authId: userId,
  })
  if (!refs || refs.billingMode !== 'native') {
    throw billingError("Aucun abonnement par carte à gérer.")
  }
  if (!refs.subscriptionRef || !refs.emailToken) {
    // Souscription native pré-migration sans token : annulation directe
    // impossible, l'UI doit basculer sur le lien hébergé (manageLink).
    throw billingError(
      'Gestion directe indisponible : utilisez le lien de gestion Paystack.',
    )
  }
  return { code: refs.subscriptionRef, token: refs.emailToken }
}

/**
 * `api.paystackSubscription.disableSubscription` : coupe le renouvellement d'une
 * souscription NATIVE chez Paystack. Source de vérité = Paystack : le webhook
 * (subscription.not_renew / disable) appliquera la rétrogradation à l'échéance.
 * On pose `autoRenew=false` localement uniquement pour un retour UI immédiat.
 */
export const disableSubscription = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean }> => {
    const { code, token } = await requireNative(ctx)
    const res = await fetch(`${PAYSTACK_BASE}/subscription/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, token }),
    })
    const json = (await res.json()) as SimpleResponse
    if (!res.ok || !json.status) {
      throw billingError(
        `Annulation impossible : ${json.message ?? res.statusText}`,
      )
    }
    // Retour UI immédiat (le webhook confirmera). On ne rétrograde pas le palier
    // ici : l'accès reste jusqu'à l'échéance.
    await ctx.runMutation(internal.billing.markNotRenew, {
      subscriptionRef: code,
    })
    return { ok: true }
  },
})

/**
 * `api.paystackSubscription.enableSubscription` : réactive une souscription
 * native chez Paystack (annule une annulation tant que la période court).
 */
export const enableSubscription = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean }> => {
    const { code, token } = await requireNative(ctx)
    const res = await fetch(`${PAYSTACK_BASE}/subscription/enable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, token }),
    })
    const json = (await res.json()) as SimpleResponse
    if (!res.ok || !json.status) {
      throw billingError(
        `Réactivation impossible : ${json.message ?? res.statusText}`,
      )
    }
    await ctx.runMutation(internal.billing.markRenewActive, {
      subscriptionRef: code,
    })
    return { ok: true }
  },
})

/**
 * `api.paystackSubscription.manageLink` : lien hébergé Paystack où le user gère
 * sa carte / annule directement. Fallback « Gérer mon abonnement » universel
 * (fonctionne même sans email_token côté Filon). Exige seulement le
 * subscription_code (subscriptionRef).
 */
export const manageLink = action({
  args: {},
  handler: async (ctx): Promise<{ link: string }> => {
    const { userId } = await requireUserFromAction(ctx)
    const refs = await ctx.runQuery(internal.paystackSubscription.nativeRefs, {
      authId: userId,
    })
    if (!refs || refs.billingMode !== 'native' || !refs.subscriptionRef) {
      throw billingError("Aucun abonnement par carte à gérer.")
    }
    const res = await fetch(
      `${PAYSTACK_BASE}/subscription/${encodeURIComponent(refs.subscriptionRef)}/manage/link`,
      { headers: { Authorization: `Bearer ${secretKey()}` } },
    )
    const json = (await res.json()) as ManageLinkResponse
    if (!res.ok || !json.status || !json.data?.link) {
      throw billingError(
        `Lien de gestion indisponible : ${json.message ?? res.statusText}`,
      )
    }
    return { link: json.data.link }
  },
})
