import { m } from '~/lib/paraglide/messages'
import type { BriefData } from './types'

/**
 * Construit le prompt de narration « Priorise ma journée » à partir des données
 * déjà calculées côté serveur. On injecte les COMPTES (déterministes) dans un
 * gabarit i18n : le LLM ne sert qu'à narrer / hiérarchiser, jamais à recalculer.
 * Aucun appel réseau ici : pure composition de chaîne.
 */
export function buildNarrationPrompt(data: BriefData): string {
  return m.brief_narration_prompt({
    followups: data.followups.length,
    overdue: data.followups.filter((f) => f.overdue).length,
    stalled: data.stalled.length,
    team: data.teamPriorities.length,
    signals: data.signals.length,
  })
}
