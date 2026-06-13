import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'

const http = httpRouter()

// Enregistre les routes Better Auth (/api/auth/*) sur le déploiement Convex,
// CORS inclus. Pattern officiel @convex-dev/better-auth (remplace le routage
// manuel + le handler CORS fait main, qui ne gérait pas l'endpoint token
// Convex utilisé par autoSignIn côté client).
authComponent.registerRoutes(http, createAuth, { cors: true })

export default http
