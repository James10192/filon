/**
 * Catalogue de conversion (pur, client) — le « cerveau » déclaratif de l'upsell
 * intelligent. Une seule source pour : quelles fonctionnalités sont verrouillées
 * à quel palier, et quelle copie de valeur les vend.
 *
 * Principe anti-nag : on vend le RÉSULTAT au moment de la valeur ou de la
 * friction, jamais à froid. Chaque entrée porte le palier requis (`requires`)
 * et une copie orientée bénéfice. Aucune décision de limite ici (le serveur
 * reste l'autorité) : ce module ne sert qu'à l'affichage et au ciblage.
 */

import type { Plan } from './plan'
import { PLAN_LABELS } from './plan'

/** Palier requis pour débloquer une fonctionnalité premium. */
export type RequiredPlan = 'pro' | 'pro_ai'

/** Identifiants stables des fonctionnalités verrouillables (teasers). */
export type FeatureId =
  | 'veille_auto'
  | 'saved_searches_multi'
  | 'unlimited_opportunities'
  | 'ai_score'
  | 'ai_draft'

/** Identifiants stables des nudges contextuels (mémoire de dismissal). */
export type NudgeId =
  | 'dashboard_near_limit'
  | 'dashboard_active_usage'
  | 'import_value'
  | 'won_value'

export type FeatureCopy = {
  /** Palier qui débloque la fonctionnalité. */
  requires: RequiredPlan
  /** Titre court de la fonctionnalité (sur le badge / dialog). */
  title: string
  /** Promesse de valeur (1 phrase, orientée résultat). */
  value: string
}

/**
 * Copie de valeur par fonctionnalité. `requires` détermine vers quel palier
 * pousser : `pro` pour l'automatisation et les limites, `pro_ai` pour l'IA.
 */
export const FEATURES: Record<FeatureId, FeatureCopy> = {
  veille_auto: {
    requires: 'pro',
    title: 'Veille automatique',
    value:
      'Filon surveille educarriere toutes les 6 heures et ajoute les offres qui vous correspondent, pendant que vous dormez.',
  },
  saved_searches_multi: {
    requires: 'pro',
    title: 'Recherches multiples',
    value:
      'Surveillez autant de combinaisons de mots-clés que vous voulez, chacune avec sa propre veille.',
  },
  unlimited_opportunities: {
    requires: 'pro',
    title: 'Pipeline illimité',
    value:
      'Suivez autant d’opportunités que nécessaire, sans plafond, avec vues multiples et relances.',
  },
  ai_score: {
    requires: 'pro_ai',
    title: 'Score de pertinence IA',
    value:
      'L’IA note chaque opportunité selon votre profil pour concentrer votre énergie là où ça compte.',
  },
  ai_draft: {
    requires: 'pro_ai',
    title: 'Brouillon de candidature IA',
    value:
      'Générez un brouillon de lettre ou d’email ciblé en quelques secondes, pour candidater 3 fois plus vite.',
  },
}

export type NudgeCopy = {
  /** Palier requis pour que ce nudge soit pertinent. */
  requires: RequiredPlan
  /** Titre du bandeau. */
  title: string
  /** Corps (orienté valeur, jamais alarmiste). */
  body: string
  /** Libellé du CTA unique. */
  cta: string
}

/** Copie des nudges contextuels (friction / valeur méritée). */
export const NUDGES: Record<NudgeId, NudgeCopy> = {
  dashboard_near_limit: {
    requires: 'pro',
    title: 'Votre pipeline se remplit',
    body: 'Vous approchez du plafond du palier Découverte. Passez à Pro pour un pipeline illimité et la veille automatique.',
    cta: 'Découvrir Pro',
  },
  dashboard_active_usage: {
    requires: 'pro',
    title: 'Vous prospectez activement',
    body: 'La veille automatique trouverait des offres comme les vôtres chaque jour, sans effort. Pro automatise votre sourcing.',
    cta: 'Activer la veille auto',
  },
  import_value: {
    requires: 'pro',
    title: 'Et si Filon le faisait pour vous ?',
    body: 'La veille automatique trouve des offres comme celle-ci toutes les 6 heures, pendant que vous dormez.',
    cta: 'Activer la veille auto',
  },
  won_value: {
    requires: 'pro_ai',
    title: 'Vous convertissez bien',
    body: 'Pro+ IA rédige vos brouillons de candidature pour aller 3 fois plus vite sur les prochaines.',
    cta: 'Découvrir Pro+ IA',
  },
}

/** Libellé du palier requis (« Pro » / « Pro+ IA ») pour un badge. */
export function requiredPlanLabel(requires: RequiredPlan): string {
  return PLAN_LABELS[requires]
}

/**
 * Le palier `current` débloque-t-il `requires` ?
 * Ordre : free < pro < pro_ai < copilot < copilot_max. Tout palier >= pro_ai
 * (donc copilot / copilot_max inclus) débloque tout ce qui requiert pro/pro_ai ;
 * `pro` débloque `pro` mais pas `pro_ai`.
 */
const UPSELL_RANK: Record<Plan, number> = {
  free: 0,
  pro: 1,
  pro_ai: 2,
  copilot: 3,
  copilot_max: 4,
}

export function planUnlocks(current: Plan, requires: RequiredPlan): boolean {
  return UPSELL_RANK[current] >= UPSELL_RANK[requires]
}
