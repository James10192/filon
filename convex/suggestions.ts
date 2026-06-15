import { query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireUser } from './lib/withUser'

/**
 * Filon · suggestions du jour (déterministes, zéro appel IA / zéro crédit).
 *
 * Dérive un petit jeu de pistes d'action à partir de l'état réel du pipeline :
 * relances en retard, opportunités dormantes (sans activité récente),
 * opportunités actives sans prochaine action, ou pipeline vide. Le frontend
 * mappe chaque `kind` vers un libellé i18n + un seed copilote.
 *
 * Multi-tenant strict : `requireUser` puis lecture via index `by_user*`.
 */

/** Stages actifs (ni gagné, ni perdu) : périmètre des suggestions. */
const ACTIVE_STAGES = new Set<Doc<'opportunities'>['stage']>([
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
])

/** Seuil d'inactivité (jours) au-delà duquel une opportunité est « dormante ». */
const STALE_DAYS = 10

export type SuggestionKind =
  | 'overdue_followups'
  | 'stale_opportunities'
  | 'no_next_action'
  | 'empty_pipeline'

export type Suggestion = {
  kind: SuggestionKind
  count: number
  /** Paramètre additionnel (ex. seuil de jours) pour l'interpolation i18n. */
  days?: number
}

function todayISO(): string {
  return new Date(Date.now()).toISOString().slice(0, 10)
}

/**
 * Calcule jusqu'à 3 suggestions prioritaires. Ordre de priorité :
 * 1) relances en retard, 2) opportunités dormantes, 3) sans prochaine action.
 * Si le pipeline actif est vide, renvoie l'unique suggestion `empty_pipeline`.
 */
export const today = query({
  args: {},
  handler: async (ctx): Promise<Suggestion[]> => {
    const { userId } = await requireUser(ctx)
    const today = todayISO()
    const staleBefore = Date.now() - STALE_DAYS * 86_400_000

    const opportunities = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const active = opportunities.filter((o) => ACTIVE_STAGES.has(o.stage))

    if (active.length === 0) {
      return [{ kind: 'empty_pipeline', count: 0 }]
    }

    const openFollowups = await ctx.db
      .query('followups')
      .withIndex('by_user_done', (q) => q.eq('userId', userId).eq('done', false))
      .collect()

    const overdueCount = openFollowups.filter((f) => f.dueDate < today).length
    const staleCount = active.filter((o) => o.updatedAt < staleBefore).length
    const noActionCount = active.filter(
      (o) => !o.nextActionAt || o.nextActionAt < today,
    ).length

    const suggestions: Suggestion[] = []
    if (overdueCount > 0) {
      suggestions.push({ kind: 'overdue_followups', count: overdueCount })
    }
    if (staleCount > 0) {
      suggestions.push({
        kind: 'stale_opportunities',
        count: staleCount,
        days: STALE_DAYS,
      })
    }
    if (noActionCount > 0) {
      suggestions.push({ kind: 'no_next_action', count: noActionCount })
    }

    return suggestions.slice(0, 3)
  },
})
