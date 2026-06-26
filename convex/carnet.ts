import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './lib/withUser'
import { requireUser } from './lib/withUser'
import { requireOrgManagerCanReadCarnet } from './lib/withOrg'
import { attachOpportunityTitles } from './followups'

/**
 * Domaine carnet partagé · lecture seule, par un MANAGER, du carnet
 * (contacts / entreprises / relances) d'un membre de SON organisation qui n'a
 * pas désactivé le partage (défaut ON). Source de vérité d'accès = `withOrg`
 * (`requireOrgManagerCanReadCarnet`). N'affecte PAS la visibilité pipeline
 * (team.pipeline / team.metrics restent inchangés).
 *
 * INVARIANT DE SÉCURITÉ : AUCUNE lecture `by_user(targetUserId)` ne se fait hors
 * du wrapper `readCarnetForMember`, qui exécute TOUJOURS la garde AVANT le
 * reader. `targetUserId: v.string()` ne valide que le TYPE, jamais l'appartenance
 * — seule la garde-avant-lecture empêche la fuite cross-org.
 */

const memberArgs = {
  organizationId: v.id('organizations'),
  targetUserId: v.string(),
}

/**
 * UNIQUE point d'accès au carnet d'un membre. Vérifie le droit (manager + même
 * org + partage activé) PUIS exécute le `reader`. Ne JAMAIS lire le carnet d'un
 * `targetUserId` autrement que via ce wrapper.
 */
async function readCarnetForMember<T>(
  ctx: QueryCtx,
  organizationId: Id<'organizations'>,
  targetUserId: string,
  reader: (ctx: QueryCtx, targetUserId: string) => Promise<T>,
): Promise<T> {
  await requireOrgManagerCanReadCarnet(ctx, organizationId, targetUserId)
  return reader(ctx, targetUserId)
}

/**
 * Contacts pro du membre (carnet). EXCLUT le réseau MLM perso : on ne renvoie
 * que les contacts sans `mlmStatus` ni `parentContactId` (décision « scope MLM
 * exclu »). Résout le nom d'entreprise, tri 'fr'.
 */
export const listContactsForMember = query({
  args: memberArgs,
  handler: (ctx, { organizationId, targetUserId }) =>
    readCarnetForMember(ctx, organizationId, targetUserId, async (c, uid) => {
      const rows = await c.db
        .query('contacts')
        .withIndex('by_user', (q) => q.eq('userId', uid))
        .collect()
      const pro = rows.filter(
        (row) =>
          row.mlmStatus === undefined && row.parentContactId === undefined,
      )
      const companyNames = new Map<Id<'companies'>, string>()
      const withCompany = await Promise.all(
        pro.map(async (row) => {
          let companyName: string | undefined
          if (row.companyId) {
            const cached = companyNames.get(row.companyId)
            if (cached !== undefined) {
              companyName = cached
            } else {
              const company = await c.db.get(row.companyId)
              companyName = company?.name
              if (companyName) companyNames.set(row.companyId, companyName)
            }
          }
          return companyName ? { ...row, companyName } : { ...row }
        }),
      )
      return withCompany.sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      )
    }),
})

/** Entreprises ciblées du membre (carnet), tri 'fr'. */
export const listCompaniesForMember = query({
  args: memberArgs,
  handler: (ctx, { organizationId, targetUserId }) =>
    readCarnetForMember(ctx, organizationId, targetUserId, async (c, uid) => {
      const rows = await c.db
        .query('companies')
        .withIndex('by_user_name', (q) => q.eq('userId', uid))
        .collect()
      // Re-tri JS 'fr' : `by_user_name` ne garantit pas l'ordre sur les accents.
      return rows.sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      )
    }),
})

/**
 * Relances du membre (carnet), triées par échéance, titres d'opportunité résolus
 * avec le `userId` de la CIBLE (sinon `attachOpportunityTitles` les masquerait
 * toutes). `done` optionnel : non fourni => toutes les relances.
 */
export const listFollowupsForMember = query({
  args: { ...memberArgs, done: v.optional(v.boolean()) },
  handler: (ctx, { organizationId, targetUserId, done }) =>
    readCarnetForMember(ctx, organizationId, targetUserId, async (c, uid) => {
      let rows = await c.db
        .query('followups')
        .withIndex('by_user_due', (q) => q.eq('userId', uid))
        .collect()
      if (done !== undefined) rows = rows.filter((f) => f.done === done)
      return attachOpportunityTitles(c, uid, rows)
    }),
})

/**
 * Journalise (dédupliqué par jour UTC) qu'un manager a consulté le carnet d'un
 * membre. RE-VALIDE la garde côté serveur ; `viewerUserId` dérivé du contexte,
 * jamais d'un argument client. UPSERT via `by_viewer_target_day` : 1 ligne /
 * (viewer × cible × jour), `viewCount` incrémenté. Appelée fire-and-forget par
 * l'UI à l'ouverture de la vue (Convex retente sur conflit OCC).
 */
export const logCarnetView = mutation({
  args: memberArgs,
  handler: async (ctx, { organizationId, targetUserId }) => {
    const octx = await requireOrgManagerCanReadCarnet(
      ctx,
      organizationId,
      targetUserId,
    )
    // On ne journalise pas l'auto-consultation d'un manager sur son propre carnet.
    if (targetUserId === octx.userId) return null

    const now = Date.now()
    const dayKey = new Date(now).toISOString().slice(0, 10)
    const existing = await ctx.db
      .query('carnetAccessLog')
      .withIndex('by_viewer_target_day', (q) =>
        q
          .eq('viewerUserId', octx.userId)
          .eq('targetUserId', targetUserId)
          .eq('dayKey', dayKey),
      )
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastViewedAt: now,
        viewCount: existing.viewCount + 1,
      })
    } else {
      await ctx.db.insert('carnetAccessLog', {
        viewerUserId: octx.userId,
        targetUserId,
        organizationId,
        dayKey,
        firstViewedAt: now,
        lastViewedAt: now,
        viewCount: 1,
      })
    }
    return null
  },
})

/**
 * Le membre courant voit qui a consulté SON carnet (90 derniers jours).
 * Résout le nom du viewer (jamais l'authId brut) ; fallback « Un manager ».
 */
export const myCarnetAccessLog = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx)
    const cutoffDay = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const rows = await ctx.db
      .query('carnetAccessLog')
      .withIndex('by_target_day', (q) =>
        q.eq('targetUserId', userId).gte('dayKey', cutoffDay),
      )
      .collect()

    const out: Array<{
      viewerName: string
      viewerImage: string | null
      dayKey: string
      lastViewedAt: number
      viewCount: number
    }> = []
    for (const r of rows) {
      const viewer = await ctx.db
        .query('users')
        .withIndex('by_authId', (q) => q.eq('authId', r.viewerUserId))
        .unique()
      out.push({
        viewerName: viewer?.name ?? 'Un manager',
        viewerImage: viewer?.image ?? null,
        dayKey: r.dayKey,
        lastViewedAt: r.lastViewedAt,
        viewCount: r.viewCount,
      })
    }
    return out.sort((a, b) => b.lastViewedAt - a.lastViewedAt)
  },
})
