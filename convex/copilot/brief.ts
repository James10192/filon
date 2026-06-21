import { query } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { optionalUser, currentPlan, type QueryCtx } from '../lib/withUser'
import { ACTIVE_STAGES } from '../lib/plan'
import { MANAGER_ROLES, type OrgRole } from '../lib/withOrg'

/**
 * Filon · Brief du jour (flagship copilot_max).
 *
 * Idée maîtresse : les DONNÉES du brief sont déterministes. On les calcule ICI,
 * côté serveur, en UNE query scopée `userId` (zéro coût LLM, instantané). Le LLM
 * n'intervient qu'en cerise (narration one-tap, via le seed copilote existant).
 *
 * Gating strict : réservé au palier `copilot_max`. Pour tout autre palier (ou
 * hors session), on renvoie `{ gated: true }` (l'UI affiche l'upsell, jamais de
 * données). Multi-tenant : lectures via index `by_user*` uniquement ; la section
 * équipe revalide le rôle manager côté serveur (`MANAGER_ROLES`).
 */

/** Cap des scans pour rester instantané (jamais de full pipeline non borné). */
const FOLLOWUP_HORIZON_DAYS = 7
const SECTION_CAP = 6
const TEAM_FLAGGED_CAP = 8

type Stage = Doc<'opportunities'>['stage']

/** Élément de relance due (en retard ou à échéance ≤ 7 jours). */
export type BriefFollowup = {
  id: Id<'followups'>
  title: string
  dueDate: string
  overdue: boolean
  opportunityTitle: string | null
}

/** Opportunité active sans prochaine action planifiée (à débloquer). */
export type BriefStalledOpp = {
  id: Id<'opportunities'>
  title: string
  stage: Stage
}

/** Opportunité d'équipe pointée prioritaire par un manager. */
export type BriefTeamFlagged = {
  id: Id<'opportunities'>
  title: string
  stage: Stage
  ownerName: string | null
}

function todayISO(): string {
  return new Date(Date.now()).toISOString().slice(0, 10)
}

function withinISO(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

/** Relances dues : non terminées, échéance < aujourd'hui+7j. Triées par date. */
async function dueFollowups(
  ctx: QueryCtx,
  userId: string,
): Promise<BriefFollowup[]> {
  const open = await ctx.db
    .query('followups')
    .withIndex('by_user_done', (q) => q.eq('userId', userId).eq('done', false))
    .collect()

  const today = todayISO()
  const horizon = withinISO(FOLLOWUP_HORIZON_DAYS)
  const due = open
    .filter((f) => f.dueDate <= horizon)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, SECTION_CAP)

  const titleCache = new Map<string, string | null>()
  const titleFor = async (
    id: Id<'opportunities'> | undefined,
  ): Promise<string | null> => {
    if (!id) return null
    const cached = titleCache.get(id)
    if (cached !== undefined) return cached
    const opp = await ctx.db.get(id)
    const title = opp && opp.userId === userId ? opp.title : null
    titleCache.set(id, title)
    return title
  }

  return Promise.all(
    due.map(async (f) => ({
      id: f._id,
      title: f.label,
      dueDate: f.dueDate,
      overdue: f.dueDate < today,
      opportunityTitle: await titleFor(f.opportunityId),
    })),
  )
}

/** Opportunités actives SANS prochaine action (ni planifiée, ni à venir). */
function stalledOpportunities(
  opportunities: Doc<'opportunities'>[],
  today: string,
): BriefStalledOpp[] {
  return opportunities
    .filter(
      (o) =>
        (ACTIVE_STAGES as readonly string[]).includes(o.stage) &&
        (!o.nextActionAt || o.nextActionAt < today),
    )
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(0, SECTION_CAP)
    .map((o) => ({ id: o._id, title: o.title, stage: o.stage }))
}

/** Org active où le user est manager (admin/head_sell), ou null. */
async function managerOrg(
  ctx: QueryCtx,
  userId: string,
): Promise<Id<'organizations'> | null> {
  const memberships = await ctx.db
    .query('memberships')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const manager = memberships.find(
    (m) => m.status === 'active' && MANAGER_ROLES.has(m.role as OrgRole),
  )
  return manager?.organizationId ?? null
}

/** Opportunités pointées prioritaires par l'équipe (cap). Manager uniquement. */
async function teamFlagged(
  ctx: QueryCtx,
  organizationId: Id<'organizations'>,
): Promise<BriefTeamFlagged[]> {
  const members = await ctx.db
    .query('memberships')
    .withIndex('by_org', (q) => q.eq('organizationId', organizationId))
    .collect()

  const out: BriefTeamFlagged[] = []
  const nameCache = new Map<string, string | null>()
  for (const m of members) {
    if (m.status !== 'active' || !m.userId) continue
    if (out.length >= TEAM_FLAGGED_CAP) break

    let ownerName = nameCache.get(m.userId) ?? null
    if (!nameCache.has(m.userId)) {
      const u = await ctx.db
        .query('users')
        .withIndex('by_authId', (q) => q.eq('authId', m.userId!))
        .unique()
      ownerName = u?.name ?? null
      nameCache.set(m.userId, ownerName)
    }

    const flagged = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', m.userId!))
      .collect()
    for (const o of flagged) {
      if (!o.flaggedPriority) continue
      out.push({ id: o._id, title: o.title, stage: o.stage, ownerName })
      if (out.length >= TEAM_FLAGGED_CAP) break
    }
  }
  return out
}

/** Progression de palier (Objectif MLM) dérivée du réseau, ou null si non défini. */
export type BriefRank = {
  goalLabel: string | null
  target: number
  activeCount: number
  remaining: number
}

/**
 * Progression de palier : réseau acquis (`contacts.mlmStatus = active`) vs cible
 * définie dans `settings`. Renvoie null si l'utilisateur n'a pas fixé d'objectif.
 * Logique alignée sur `mlm.rankProgress` (dérivée du réseau, jamais l'entreprise).
 */
async function rankProgress(
  ctx: QueryCtx,
  userId: string,
): Promise<BriefRank | null> {
  const settings = await ctx.db
    .query('settings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  const target = settings?.rankGoalTargetActives ?? null
  if (target === null) return null

  const active = await ctx.db
    .query('contacts')
    .withIndex('by_user_mlmStatus', (q) =>
      q.eq('userId', userId).eq('mlmStatus', 'active'),
    )
    .collect()
  const activeCount = active.length
  return {
    goalLabel: settings?.rankGoalLabel ?? null,
    target,
    activeCount,
    remaining: Math.max(0, target - activeCount),
  }
}

/** Captures de veille récentes (signaux IA), les plus pertinentes d'abord. */
async function recentSignals(ctx: QueryCtx, userId: string) {
  const signals = await ctx.db
    .query('aiSignals')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  const top = signals
    .sort((a, b) => b.createdAt - a.createdAt || b.score - a.score)
    .slice(0, SECTION_CAP)

  return Promise.all(
    top.map(async (s) => {
      const opp = await ctx.db.get(s.opportunityId)
      return {
        id: s._id,
        opportunityId: s.opportunityId,
        title: opp && opp.userId === userId ? opp.title : null,
        score: s.score,
        suggestedAction: s.suggestedAction,
      }
    }),
  )
}

/**
 * `api.copilot.brief.get` : tout le brief en une lecture déterministe. Renvoie
 * `{ gated: true }` si le palier n'est pas `copilot_max`.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx)
    if (!user) return { gated: true as const }
    const { userId } = user

    const plan = await currentPlan(ctx, userId)
    if (plan !== 'copilot_max') return { gated: true as const }

    const today = todayISO()
    const opportunities = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const followups = await dueFollowups(ctx, userId)
    const stalled = stalledOpportunities(opportunities, today)
    const rank = await rankProgress(ctx, userId)

    const orgId = await managerOrg(ctx, userId)
    const teamPriorities = orgId ? await teamFlagged(ctx, orgId) : []
    const signals = await recentSignals(ctx, userId)

    return {
      gated: false as const,
      generatedAt: Date.now(),
      followups,
      stalled,
      rank,
      teamPriorities,
      isManager: orgId !== null,
      signals,
    }
  },
})
