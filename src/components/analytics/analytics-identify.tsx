import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { identifyUser, setPersonProps } from '~/lib/analytics'
import { getLocale } from '~/lib/paraglide/runtime'

/**
 * Rattache la personne PostHog à l'utilisateur Better Auth (`identify`) dès que
 * la session est connue, puis enrichit le profil avec le palier (`plan`) une fois
 * `api.billing.myPlan` chargé. `distinctId` = id Better Auth, IDENTIQUE au
 * distinctId des événements serveur (cf. convex/lib/track.ts) → le funnel
 * anonyme → identifié → payant se recolle sur une seule personne.
 *
 * Monté dans la coquille authentifiée (à côté d'AppShell), jamais dans la chaîne
 * de providers SSR fragile de `app/route.tsx`. Ne rend rien.
 */
export function AnalyticsIdentify({
  userId,
  email,
  name,
}: {
  userId: string
  email: string
  name?: string | null
}) {
  const myPlan = useQuery(api.billing.myPlan, {})

  useEffect(() => {
    if (!userId) return
    identifyUser(userId, {
      email,
      ...(name ? { name } : {}),
      locale: getLocale(),
    })
  }, [userId, email, name])

  useEffect(() => {
    if (!userId || !myPlan) return
    setPersonProps({
      plan: myPlan.plan,
      ...(myPlan.planInterval ? { plan_interval: myPlan.planInterval } : {}),
    })
  }, [userId, myPlan])

  return null
}
