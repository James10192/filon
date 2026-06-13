import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

// URLs Convex inlinées au build par Vite (import.meta.env), donc disponibles
// au runtime serveur (Nitro/Vercel) où les VITE_* ne sont PAS dans process.env.
const convexUrl =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ??
  (typeof process !== 'undefined' ? process.env.VITE_CONVEX_URL : undefined) ??
  ''
const convexSiteUrl =
  (import.meta.env.VITE_CONVEX_SITE_URL as string | undefined) ??
  (typeof process !== 'undefined' ? process.env.VITE_CONVEX_SITE_URL : undefined) ??
  ''

// Proxy auth officiel + helpers SSR. `handler` relaie proprement /api/auth/*
// (cookies + endpoint token Convex) vers le déploiement Convex.
export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({ convexUrl, convexSiteUrl })
