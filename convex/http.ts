import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'
import { handlePaystackWebhook } from './paystackWebhook'

const http = httpRouter()

// Enregistre les routes Better Auth (/api/auth/*) sur le déploiement Convex,
// CORS inclus. Pattern officiel @convex-dev/better-auth (remplace le routage
// manuel + le handler CORS fait main, qui ne gérait pas l'endpoint token
// Convex utilisé par autoSignIn côté client).
authComponent.registerRoutes(http, createAuth, { cors: true })

// Webhook Paystack signé (HMAC-SHA512 du corps brut avec la clé secrète).
// URL à enregistrer dans le dashboard Paystack :
//   https://<deployment>.convex.site/paystack/webhook
//
// Events à activer dans le dashboard (Settings → Webhooks) pour les
// souscriptions natives : charge.success, subscription.create,
// subscription.disable, subscription.not_renew, invoice.create, invoice.update,
// invoice.payment_failed. (Les plan_code test ≠ live : ne pas activer les
// events subscription.* en live tant que `paystackPlans:ensurePlans` n'a pas
// tourné en mode live.)
http.route({
  path: '/paystack/webhook',
  method: 'POST',
  handler: handlePaystackWebhook,
})

export default http
