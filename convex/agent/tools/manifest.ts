import type { Plan } from '../../lib/plan'
import type { OrgRole } from '../../lib/withOrg'

/**
 * Manifeste de gating des outils du copilote : UNE seule source de vérité pour
 * les noms d'outils et leur condition d'exposition (palier + rôle d'org). Le
 * gating (`gating.toolsFor`) et le registre de widgets s'appuient sur ces noms,
 * de sorte que l'exposition et le rendu ne se désynchronisent jamais.
 *
 * Règles (cf. P3) :
 *  - Outils solo (pipeline / carnet / propositions / relances) + composites de
 *    lecture réseau / affiliation / veille + `set_rank_goal` : TOUS les paliers
 *    dotés du copilote (le palier est déjà filtré en amont par l'accès IA).
 *  - `team_overview` / `flag_priority` / `unflag_priority` : uniquement un rôle
 *    MANAGER d'organisation (admin / head_sell).
 */

/** Rôle manager d'organisation (voit l'équipe, pointe les priorités). */
const MANAGER_ROLES: ReadonlySet<OrgRole> = new Set<OrgRole>([
  'admin',
  'head_sell',
])

/** Le rôle résolu (ou null hors org) est-il un rôle manager ? */
export function isManager(role: OrgRole | null): boolean {
  return role !== null && MANAGER_ROLES.has(role)
}

export type ToolGate = (plan: Plan, role: OrgRole | null) => boolean

/** Disponible à tout palier doté du copilote, quel que soit le rôle. */
const anyCopilot: ToolGate = () => true

/** Réservé aux managers d'organisation (admin / head_sell). */
const managerOnly: ToolGate = (_plan, role) => isManager(role)

/**
 * Manifeste : nom d'outil → porte d'exposition. TOUT outil monté sur l'Agent
 * DOIT figurer ici ; un outil absent du manifeste est masqué par défaut (fail
 * closed), ce qui évite d'exposer un outil non gouverné par oubli.
 */
export const TOOL_MANIFEST: Record<string, { gate: ToolGate }> = {
  // --- Couche solo (pipeline / relances / propositions / carnet) ---
  summarize_pipeline: { gate: anyCopilot },
  pipeline_stats: { gate: anyCopilot },
  list_opportunities: { gate: anyCopilot },
  opportunities_needing_action: { gate: anyCopilot },
  search_opportunities: { gate: anyCopilot },
  create_opportunity: { gate: anyCopilot },
  update_opportunity_stage: { gate: anyCopilot },
  draft_application: { gate: anyCopilot },
  add_activity: { gate: anyCopilot },
  due_followups: { gate: anyCopilot },
  schedule_followup: { gate: anyCopilot },
  list_proposals: { gate: anyCopilot },
  get_proposal_detail: { gate: anyCopilot },
  find_company: { gate: anyCopilot },
  find_contact: { gate: anyCopilot },

  // --- Couche premium : composites de lecture + objectif de palier ---
  network_status: { gate: anyCopilot },
  referral_overview: { gate: anyCopilot },
  veille_digest: { gate: anyCopilot },
  set_rank_goal: { gate: anyCopilot },

  // --- Couche équipe : managers uniquement (admin / head_sell) ---
  team_overview: { gate: managerOnly },
  flag_priority: { gate: managerOnly },
  unflag_priority: { gate: managerOnly },
}

/** Un outil est-il exposé pour ce palier + rôle ? Fail closed si absent. */
export function isToolExposed(
  toolName: string,
  plan: Plan,
  role: OrgRole | null,
): boolean {
  return TOOL_MANIFEST[toolName]?.gate(plan, role) ?? false
}
