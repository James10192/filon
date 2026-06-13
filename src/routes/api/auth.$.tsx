import { createFileRoute } from '@tanstack/react-router'
import { handler } from '~/lib/auth/auth-server'

// Relai des requêtes Better Auth vers Convex via le handler officiel
// (@convex-dev/better-auth/react-start). Gère cookies, CORS et endpoint token.
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handler(request),
      POST: ({ request }: { request: Request }) => handler(request),
    },
  },
})
