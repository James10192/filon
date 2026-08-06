import { m } from '~/lib/paraglide/messages'
import type { PaidPlan } from '~/lib/billing/plan'

/**
 * Catalogue déclaratif des paliers pour la page Tarifs (libellés + arguments).
 * Données pures, pas de logique. Les prix viennent de `convex/lib/pricing.ts`
 * (source unique). Les limites chiffrées viennent de `convex/lib/plan.ts`.
 *
 * Libellés internationalisés : `name`, `tagline` et `features` sont des
 * accesseurs (`() => …`) résolus au rendu pour suivre la langue active.
 */

export type PlanKey = 'discovery_v2' | 'pro_v2' | 'copilot_v2' | 'team_v2'

export type PlanCard = {
  key: PlanKey
  priceKey?: PaidPlan
  quoteOnly?: boolean
  name: () => string
  tagline: () => string
  /** Palier mis en avant (bordure accent, badge « Recommandé »). */
  featured?: boolean
  /** Arguments clés affichés sous le prix. */
  features: () => string[]
}

export const PLAN_CARDS: PlanCard[] = [
  {
    key: 'discovery_v2',
    name: () => 'Découverte',
    tagline: () => 'Pour organiser votre prospection',
    features: () => [
      '25 opportunités actives',
      '1 veille enregistrée',
      'Carnet privé par défaut',
    ],
  },
  {
    key: 'pro_v2',
    priceKey: 'pro_v2',
    name: () => 'Pro',
    tagline: () => 'Pour piloter votre activité commerciale',
    features: () => [
      'Pipeline et veille illimités',
      '5 000 crédits IA par mois',
      'Exports et analyses',
    ],
  },
  {
    key: 'copilot_v2',
    priceKey: 'copilot_v2',
    name: () => 'Copilot',
    tagline: () => 'Pour déléguer les tâches répétitives',
    featured: true,
    features: () => [
      '12 000 crédits IA par mois',
      'Actions guidées et agent',
      'Routage qualité et BYOK',
    ],
  },
  {
    key: 'team_v2',
    quoteOnly: true,
    name: () => 'Équipe',
    tagline: () => 'Pour déployer Filon à plusieurs',
    features: () => [
      'Espaces et accès d’équipe',
      'Accompagnement au déploiement',
      'Conditions adaptées à l’organisation',
    ],
  },
]

/** Tableau comparatif : lignes de fonctionnalités × paliers. */
