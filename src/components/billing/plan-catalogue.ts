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

export type PlanKey = 'free' | PaidPlan

export type PlanCard = {
  key: PlanKey
  name: () => string
  tagline: () => string
  /** Palier mis en avant (bordure accent, badge « Recommandé »). */
  featured?: boolean
  /** Arguments clés affichés sous le prix. */
  features: () => string[]
}

export const PLAN_CARDS: PlanCard[] = [
  {
    key: 'free',
    name: m.app_plan_free_name,
    tagline: m.app_plan_free_tagline,
    features: () => [
      m.app_plan_free_feat_1(),
      m.app_plan_free_feat_2(),
      m.app_plan_free_feat_3(),
      m.app_plan_free_feat_4(),
      m.app_plan_free_feat_team(),
    ],
  },
  {
    key: 'pro',
    name: m.app_plan_pro_name,
    tagline: m.app_plan_pro_tagline,
    featured: true,
    features: () => [
      m.app_plan_pro_feat_1(),
      m.app_plan_pro_feat_2(),
      m.app_plan_pro_feat_3(),
      m.app_plan_pro_feat_4(),
      m.app_plan_pro_feat_team(),
    ],
  },
  {
    key: 'pro_ai',
    name: m.app_plan_pro_ai_name,
    tagline: m.app_plan_pro_ai_tagline,
    features: () => [
      m.app_plan_pro_ai_feat_1(),
      m.app_plan_pro_ai_feat_2(),
      m.app_plan_pro_ai_feat_3(),
      m.app_plan_pro_ai_feat_4(),
    ],
  },
  {
    key: 'copilot',
    name: m.app_plan_copilot_name,
    tagline: m.app_plan_copilot_tagline,
    features: () => [
      m.app_plan_copilot_feat_1(),
      m.app_plan_copilot_feat_2(),
      m.app_plan_copilot_feat_3(),
      m.app_plan_copilot_feat_4(),
      m.app_plan_copilot_feat_5(),
    ],
  },
]

/** Tableau comparatif : lignes de fonctionnalités × paliers. */
export type CompareRow = {
  label: () => string
  free: string | boolean
  pro: string | boolean
  pro_ai: string | boolean
  copilot: string | boolean
}

export const COMPARE_ROWS: CompareRow[] = [
  { label: m.app_compare_active_opps, free: '25', pro: m.app_unlimited(), pro_ai: m.app_unlimited(), copilot: m.app_unlimited() },
  { label: m.app_compare_watch_searches, free: '1', pro: m.app_unlimited(), pro_ai: m.app_unlimited(), copilot: m.app_unlimited() },
  { label: m.app_compare_auto_watch, free: false, pro: true, pro_ai: true, copilot: true },
  { label: m.app_compare_views, free: true, pro: true, pro_ai: true, copilot: true },
  { label: m.app_compare_followups_analytics, free: false, pro: true, pro_ai: true, copilot: true },
  { label: m.app_compare_export, free: false, pro: true, pro_ai: true, copilot: true },
  { label: m.app_compare_ai_credits, free: '25', pro: '100', pro_ai: '300', copilot: '6000' },
  { label: m.app_compare_ai_assistant, free: true, pro: true, pro_ai: true, copilot: true },
  { label: m.app_compare_scoring, free: false, pro: false, pro_ai: true, copilot: true },
  { label: m.app_compare_drafts, free: false, pro: false, pro_ai: true, copilot: true },
  { label: m.app_compare_agentic, free: false, pro: false, pro_ai: false, copilot: true },
  { label: m.app_compare_action_log, free: false, pro: false, pro_ai: false, copilot: true },
  { label: m.app_compare_fair_use_byok, free: false, pro: false, pro_ai: false, copilot: true },
  // --- Équipe (org ouverte à tous, limite de membres = levier free) ---
  { label: m.app_compare_org_team, free: m.app_members_3(), pro: m.app_unlimited(), pro_ai: m.app_unlimited(), copilot: m.app_unlimited() },
  { label: m.app_compare_priority_flag, free: true, pro: true, pro_ai: true, copilot: true },
  { label: m.app_compare_member_reports, free: false, pro: true, pro_ai: true, copilot: true },
]
