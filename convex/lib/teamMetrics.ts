import type { Doc, Id } from '../_generated/dataModel'
import type { QueryCtx } from './withUser'
import { ACTIVE_STAGES } from './plan'
import { activeMemberships } from './withOrg'

/**
 * Calcul des métriques d'équipe d'une organisation, factorisé pour être partagé
 * entre la lecture publique (`api.team.metrics`, tableau de bord head sell) et le
 * copilote (outil `team_overview`). Pure visibilité : aucune table métier ne
 * porte d'`organizationId`, on itère les `userId` des membres ACTIFS sur les
 * index `by_user*`. Le contrôle d'accès (manager) reste à la charge de l'appelant.
 */

export type Stage = Doc<'opportunities'>['stage']

export const STAGE_KEYS: Stage[] = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
]

/** Profil d'affichage d'un membre (résolu une fois par membre). */
export type MemberProfile = {
  userId: string
  name: string | null
  email: string
  image: string | null
  role: Doc<'memberships'>['role']
}

/** Métriques calculées pour un membre (comptage en mémoire sur lecture indexée). */
export type MemberMetrics = {
  total: number
  active: number
  won: number
  lost: number
  flagged: number
  overdueFollowups: number
  /** Taux de conversion = gagnées / (gagnées + perdues), 0 si rien de clos. */
  conversion: number
  byStage: Record<Stage, number>
}

export function emptyByStage(): Record<Stage, number> {
  return {
    lead: 0,
    contacted: 0,
    applied: 0,
    interview: 0,
    negotiation: 0,
    won: 0,
    lost: 0,
  }
}

/** Résout les profils des membres actifs (avec leur rôle), indexés par userId. */
export async function memberProfiles(
  ctx: QueryCtx,
  organizationId: Id<'organizations'>,
): Promise<Map<string, MemberProfile>> {
  const members = await activeMemberships(ctx, organizationId)
  const map = new Map<string, MemberProfile>()
  for (const m of members) {
    if (!m.userId) continue
    const u = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', m.userId!))
      .unique()
    map.set(m.userId, {
      userId: m.userId,
      name: u?.name ?? null,
      email: u?.email ?? m.email,
      image: u?.image ?? null,
      role: m.role,
    })
  }
  return map
}

/** Métriques d'un membre, à partir de ses opportunités et relances ouvertes. */
async function metricsForMember(
  ctx: QueryCtx,
  userId: string,
  now: number,
): Promise<MemberMetrics> {
  const opps = await ctx.db
    .query('opportunities')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  const byStage = emptyByStage()
  let active = 0
  let flagged = 0
  for (const o of opps) {
    byStage[o.stage] += 1
    if ((ACTIVE_STAGES as readonly string[]).includes(o.stage)) active += 1
    if (o.flaggedPriority) flagged += 1
  }
  const won = byStage.won
  const lost = byStage.lost
  const closed = won + lost

  const openFollowups = await ctx.db
    .query('followups')
    .withIndex('by_user_done', (q) => q.eq('userId', userId).eq('done', false))
    .collect()
  const overdueFollowups = openFollowups.filter((f) => {
    const t = new Date(f.dueDate).getTime()
    return Number.isFinite(t) && t < now
  }).length

  return {
    total: opps.length,
    active,
    won,
    lost,
    flagged,
    overdueFollowups,
    conversion: closed > 0 ? won / closed : 0,
    byStage,
  }
}

export type TeamMetricsResult = {
  generatedAt: number
  members: Array<MemberProfile & { metrics: MemberMetrics }>
  totals: MemberMetrics
}

/**
 * Métriques par membre actif + totaux de l'org (somme des membres). Trie les
 * membres par nom/e-mail. L'appelant a déjà vérifié le rôle manager.
 */
export async function computeTeamMetrics(
  ctx: QueryCtx,
  organizationId: Id<'organizations'>,
): Promise<TeamMetricsResult> {
  const profiles = await memberProfiles(ctx, organizationId)
  const now = Date.now()

  const perMember: Array<MemberProfile & { metrics: MemberMetrics }> = []
  for (const profile of profiles.values()) {
    perMember.push({
      ...profile,
      metrics: await metricsForMember(ctx, profile.userId, now),
    })
  }
  perMember.sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email, 'fr'),
  )

  const totals: MemberMetrics = {
    total: 0,
    active: 0,
    won: 0,
    lost: 0,
    flagged: 0,
    overdueFollowups: 0,
    conversion: 0,
    byStage: emptyByStage(),
  }
  for (const m of perMember) {
    totals.total += m.metrics.total
    totals.active += m.metrics.active
    totals.won += m.metrics.won
    totals.lost += m.metrics.lost
    totals.flagged += m.metrics.flagged
    totals.overdueFollowups += m.metrics.overdueFollowups
    for (const s of STAGE_KEYS) totals.byStage[s] += m.metrics.byStage[s]
  }
  const totalClosed = totals.won + totals.lost
  totals.conversion = totalClosed > 0 ? totals.won / totalClosed : 0

  return { generatedAt: now, members: perMember, totals }
}
