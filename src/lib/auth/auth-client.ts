import { createAuthClient } from 'better-auth/react'
import { convexClient } from '@convex-dev/better-auth/client/plugins'

// Pattern officiel : baseURL same-origin par défaut (/api/auth), proxié vers
// Convex par le handler react-start. Pas de customFetchImpl manuel (celui-ci
// renvoyait l'endpoint token Convex en cross-origin -> "Failed to fetch" au
// signup/autoSignIn). convexClient() gère l'échange de token via le proxy.
export const authClient = createAuthClient({
  plugins: [convexClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient
