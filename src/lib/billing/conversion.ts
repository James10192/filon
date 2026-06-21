/**
 * Catalogue de conversion (pur, client) — le « cerveau » déclaratif de l'upsell
 * intelligent. Une seule source pour : quelles fonctionnalités sont verrouillées
 * à quel palier, et quelle copie de valeur les vend.
 *
 * Deux principes durs :
 *  1. Anti-nag : on vend le RÉSULTAT au moment de la valeur ou de la friction,
 *     jamais à froid. Aucune décision de limite ici (le serveur reste l'autorité).
 *  2. VÉRITÉ : chaque promesse correspond à une capacité RÉELLE du palier. La
 *     veille auto ne surveille que des sites d'offres d'emploi (educarriere,
 *     Novojob) : on ne la vend donc pas comme un radar de prospection universel.
 *     L'argument IA universel (tous métiers) est le Copilot, persona-aware.
 *
 * i18n : la copie est rendue via Paraglide (FR/EN), jamais en dur.
 */

import { m } from '~/lib/paraglide/messages'
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
  title: () => string
  /** Promesse de valeur (1 phrase, orientée résultat, VRAIE). */
  value: () => string
}

/**
 * Copie de valeur par fonctionnalité. `requires` détermine vers quel palier
 * pousser : `pro` pour l'automatisation et les limites, `pro_ai` pour l'IA.
 */
export const FEATURES: Record<FeatureId, FeatureCopy> = {
  veille_auto: {
    requires: 'pro',
    title: m.conv_feat_veille_auto_title,
    value: m.conv_feat_veille_auto_value,
  },
  saved_searches_multi: {
    requires: 'pro',
    title: m.conv_feat_searches_title,
    value: m.conv_feat_searches_value,
  },
  unlimited_opportunities: {
    requires: 'pro',
    title: m.conv_feat_pipeline_title,
    value: m.conv_feat_pipeline_value,
  },
  ai_score: {
    requires: 'pro_ai',
    title: m.conv_feat_aiscore_title,
    value: m.conv_feat_aiscore_value,
  },
  ai_draft: {
    requires: 'pro_ai',
    title: m.conv_feat_aidraft_title,
    value: m.conv_feat_aidraft_value,
  },
}

export type NudgeCopy = {
  /** Palier requis pour que ce nudge soit pertinent. */
  requires: RequiredPlan
  /** Titre du bandeau. */
  title: () => string
  /** Corps (orienté valeur, jamais alarmiste, VRAI). */
  body: () => string
  /** Libellé du CTA unique. */
  cta: () => string
}

/** Copie des nudges contextuels (friction / valeur méritée). */
export const NUDGES: Record<NudgeId, NudgeCopy> = {
  dashboard_near_limit: {
    requires: 'pro',
    title: m.conv_nudge_near_limit_title,
    body: m.conv_nudge_near_limit_body,
    cta: m.conv_nudge_near_limit_cta,
  },
  dashboard_active_usage: {
    requires: 'pro',
    title: m.conv_nudge_active_title,
    body: m.conv_nudge_active_body,
    cta: m.conv_nudge_active_cta,
  },
  import_value: {
    requires: 'pro',
    title: m.conv_nudge_import_title,
    body: m.conv_nudge_import_body,
    cta: m.conv_nudge_import_cta,
  },
  won_value: {
    requires: 'pro_ai',
    title: m.conv_nudge_won_title,
    body: m.conv_nudge_won_body,
    cta: m.conv_nudge_won_cta,
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
