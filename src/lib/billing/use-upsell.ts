/**
 * `useUpsell()` — cerveau central de la couche de conversion.
 *
 * Lit le palier courant (api.billing.myPlan) et expose des helpers purs pour
 * que les pages décident quoi montrer, sans dupliquer la logique de palier :
 *
 *  - `plan`            palier effectif ('free' | 'pro' | 'pro_ai').
 *  - `canUse(feature)` la fonctionnalité premium est-elle débloquée ?
 *  - `unlocks(req)`    le palier débloque-t-il un palier requis ?
 *  - `feature(id)`     copie de valeur d'une fonctionnalité.
 *  - `shouldNudge(id)` ce nudge est-il pertinent ET affichable (tier + cap +
 *                      dismissal) ? C'est ici que se joue l'anti-nag.
 *  - `markNudgeShown` / `dismissNudge` mémoire d'affichage.
 *
 * Tier-awareness (jamais harceler un payeur) :
 *  - free   → push Pro (+ teasers Pro+ IA sur les features IA).
 *  - pro    → uniquement teasers Pro+ IA, et seulement sur l'IA.
 *  - pro_ai → RIEN (aucun upsell).
 */

import { useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Plan } from './plan'
import {
  FEATURES,
  NUDGES,
  planUnlocks,
  type FeatureId,
  type NudgeId,
  type RequiredPlan,
} from './conversion'
import { canShowNudge, dismiss, markShown } from './dismissal'

export type UseUpsell = {
  /** `undefined` tant que le palier n'est pas chargé (évite les flashs). */
  loaded: boolean
  plan: Plan
  /** La fonctionnalité premium est-elle accessible au palier courant ? */
  canUse: (feature: FeatureId) => boolean
  /** Le palier courant débloque-t-il `requires` ? */
  unlocks: (requires: RequiredPlan) => boolean
  /** Copie de valeur d'une fonctionnalité (titre + promesse + palier requis). */
  feature: (id: FeatureId) => (typeof FEATURES)[FeatureId]
  /** Ce nudge est-il pertinent pour le palier ET affichable (cap + dismissal) ? */
  shouldNudge: (id: NudgeId) => boolean
  markNudgeShown: (id: NudgeId) => void
  dismissNudge: (id: NudgeId) => void
}

export function useUpsell(): UseUpsell {
  const myPlan = useQuery(api.billing.myPlan, {})
  const plan: Plan = myPlan?.plan ?? 'free'
  const loaded = myPlan !== undefined

  const canUse = useCallback(
    (feature: FeatureId) => planUnlocks(plan, FEATURES[feature].requires),
    [plan],
  )

  const unlocks = useCallback(
    (requires: RequiredPlan) => planUnlocks(plan, requires),
    [plan],
  )

  const feature = useCallback((id: FeatureId) => FEATURES[id], [])

  const shouldNudge = useCallback(
    (id: NudgeId) => {
      if (!loaded) return false
      const requires = NUDGES[id].requires
      // Tier-awareness : pro_ai ne voit jamais rien ; pro ne voit que Pro+ IA.
      if (plan === 'pro_ai') return false
      if (plan === 'pro' && requires !== 'pro_ai') return false
      if (planUnlocks(plan, requires)) return false
      return canShowNudge(id)
    },
    [loaded, plan],
  )

  const markNudgeShown = useCallback((id: NudgeId) => markShown(id), [])
  const dismissNudge = useCallback((id: NudgeId) => dismiss(id), [])

  return {
    loaded,
    plan,
    canUse,
    unlocks,
    feature,
    shouldNudge,
    markNudgeShown,
    dismissNudge,
  }
}
