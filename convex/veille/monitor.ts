import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  query,
} from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { limitsFor, planOf } from '../lib/plan'
import { requireUser } from '../lib/withUser'

/**
 * Veille · opérations de données côté cron + lecture santé des sources.
 *
 * Ces fonctions sont `internal*` (sauf `sourceHealth`, lecture publique) : non
 * appelables par le client, donc pas de `requireUser`. Elles reçoivent un
 * `userId` explicite (le moniteur itère les veilles de tous les users).
 */

/** Veille enrichie, telle que consommée par le moniteur. */
export type MonitorSearch = {
  _id: Id<'savedSearches'>
  userId: string
  /** Libellé lisible (nom de la veille, à défaut mots-clés joints). */
  label: string
  include: string[]
  exclude: string[]
  /** Connecteurs ciblés ; `null` = toutes les sources auto. */
  sources: string[] | null
  intent: 'apply' | 'prospect' | 'both'
  notify: boolean
}

/** Doc `savedSearches` -> forme enrichie consommée par le moniteur. */
function toMonitorSearch(r: Doc<'savedSearches'>): MonitorSearch {
  const label = r.name?.trim() || r.keywords.join(', ') || 'veille'
  return {
    _id: r._id,
    userId: r.userId,
    label,
    include: r.keywords,
    exclude: r.excludeKeywords ?? [],
    sources: r.sources && r.sources.length > 0 ? r.sources : null,
    intent: r.intent ?? 'apply',
    notify: r.notify ?? false,
  }
}

/**
 * Veilles actives des users éligibles à la surveillance AUTOMATIQUE (palier
 * pro / pro_ai / copilot). Le cron SAUTE les veilles des users gratuits : sur
 * Découverte, la veille reste manuelle. Palier résolu via `by_authId` (cache
 * local par userId pour ne pas relire la même ligne `users`).
 */
export const enabledSearches = internalQuery({
  args: {},
  handler: async (ctx): Promise<MonitorSearch[]> => {
    const rows = await ctx.db
      .query('savedSearches')
      .withIndex('by_enabled', (q) => q.eq('enabled', true))
      .collect()

    const autoByUser = new Map<string, boolean>()
    const out: MonitorSearch[] = []
    for (const r of rows) {
      let auto = autoByUser.get(r.userId)
      if (auto === undefined) {
        const userDoc = await ctx.db
          .query('users')
          .withIndex('by_authId', (q) => q.eq('authId', r.userId))
          .unique()
        auto = limitsFor(planOf(userDoc?.plan ?? null)).veilleAutoMonitor
        autoByUser.set(r.userId, auto)
      }
      if (!auto) continue
      out.push(toMonitorSearch(r))
    }
    return out
  },
})

/**
 * Veilles actives d'UN user (pour « Lancer maintenant »). Aucun gating de palier :
 * le déclenchement manuel est ouvert à tous (c'est LA veille des comptes gratuits).
 * `lastRun` = passage le plus récent parmi ses veilles (pour le cooldown anti-abus).
 */
export const userEnabledSearches = internalQuery({
  args: { userId: v.string() },
  handler: async (
    ctx,
    { userId },
  ): Promise<{ searches: MonitorSearch[]; lastRun: number }> => {
    const rows = await ctx.db
      .query('savedSearches')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const enabled = rows.filter((r) => r.enabled)
    const lastRun = rows.reduce((max, r) => Math.max(max, r.lastRunAt ?? 0), 0)
    return { searches: enabled.map(toMonitorSearch), lastRun }
  },
})

/** Position suivante (max + 1) dans la colonne `lead` du user. */
async function nextLeadOrder(
  ctx: { db: { query: (t: 'opportunities') => unknown } },
  userId: string,
): Promise<number> {
  const db = (ctx as unknown as { db: { query: (t: string) => any } }).db
  const inStage: Doc<'opportunities'>[] = await db
    .query('opportunities')
    .withIndex('by_user_stage', (q: any) =>
      q.eq('userId', userId).eq('stage', 'lead'),
    )
    .collect()
  return inStage.reduce((max, o) => Math.max(max, o.order), -1) + 1
}

/**
 * Importe une offre détectée par le moniteur dans le pipeline du user.
 * Déduplique via l'index `by_user_sourceUrl` (idempotent sur ré-exécutions).
 * L'intention de la veille pilote le `type` (prospect vs offre) et les tags.
 * Retourne l'`Id` de l'opportunité créée, ou `null` si déjà présente (doublon).
 */
export const importFromMonitor = internalMutation({
  args: {
    userId: v.string(),
    title: v.string(),
    sourceUrl: v.string(),
    connectorId: v.string(),
    intent: v.union(
      v.literal('apply'),
      v.literal('prospect'),
      v.literal('both'),
    ),
  },
  handler: async (ctx, args): Promise<Id<'opportunities'> | null> => {
    const { userId, title, sourceUrl, connectorId, intent } = args

    const existing = await ctx.db
      .query('opportunities')
      .withIndex('by_user_sourceUrl', (q) =>
        q.eq('userId', userId).eq('sourceUrl', sourceUrl),
      )
      .first()
    if (existing) return null

    const now = Date.now()
    const order = await nextLeadOrder(ctx, userId)
    // Démarcher = prospect (entreprise qui recrute = budget = cible presta).
    const type = intent === 'prospect' ? 'prospect' : 'job_offer'
    const tags = ['veille', connectorId, intent]

    const opportunityId: Id<'opportunities'> = await ctx.db.insert(
      'opportunities',
      {
        userId,
        title,
        type,
        stage: 'lead',
        priority: 'medium',
        tags,
        order,
        importSource: connectorId === 'educarriere' ? 'educarriere' : 'autre',
        sourceUrl,
        importedAt: now,
        source: connectorId,
        url: sourceUrl,
        createdAt: now,
        updatedAt: now,
      },
    )

    await ctx.db.insert('activities', {
      userId,
      opportunityId,
      kind: 'other',
      content: `Détecté par la veille (${connectorId}) : ${title}`,
      createdAt: now,
    })

    return opportunityId
  },
})

/** Met à jour les métadonnées d'exécution d'une veille. */
export const markRun = internalMutation({
  args: { searchId: v.id('savedSearches'), count: v.number() },
  handler: async (ctx, args): Promise<null> => {
    const now = Date.now()
    await ctx.db.patch(args.searchId, {
      lastRunAt: now,
      lastMatchCount: args.count,
      updatedAt: now,
    })
    return null
  },
})

/**
 * Enregistre la santé d'un connecteur après un passage (upsert par connecteur).
 * Remplace l'échec muet : « educarriere opérationnel · novojob en panne » devient
 * affichable. `ok=false` conserve `lastOkAt`/`lastCount` du dernier succès.
 */
export const recordSourceHealth = internalMutation({
  args: {
    connectorId: v.string(),
    ok: v.boolean(),
    count: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const now = Date.now()
    const existing = await ctx.db
      .query('veilleSourceHealth')
      .withIndex('by_connector', (q) => q.eq('connectorId', args.connectorId))
      .unique()

    const patch: Partial<Doc<'veilleSourceHealth'>> = {
      ok: args.ok,
      lastRunAt: now,
      updatedAt: now,
    }
    if (args.ok) {
      patch.lastOkAt = now
      if (args.count !== undefined) patch.lastCount = args.count
      patch.lastError = undefined
    } else if (args.error !== undefined) {
      patch.lastError = args.error
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
    } else {
      await ctx.db.insert('veilleSourceHealth', {
        connectorId: args.connectorId,
        ok: args.ok,
        lastRunAt: now,
        lastOkAt: args.ok ? now : undefined,
        lastCount: args.ok ? args.count : undefined,
        lastError: args.ok ? undefined : args.error,
        updatedAt: now,
      })
    }
    return null
  },
})

/** Notifie (cloche) qu'une veille a importé de nouvelles offres. */
export const notifyVeilleImport = internalMutation({
  args: { userId: v.string(), count: v.number(), searchLabel: v.string() },
  handler: async (ctx, args): Promise<null> => {
    if (args.count <= 0) return null
    const plural = args.count > 1 ? 's' : ''
    await ctx.db.insert('notifications', {
      userId: args.userId,
      kind: 'veille_import',
      title: `${args.count} nouvelle${plural} offre${plural} détectée${plural}`,
      body: `Votre veille « ${args.searchLabel} » a ajouté ${args.count} offre${plural} à votre pipeline.`,
      actionUrl: '/app/opportunites',
      read: false,
      emailSent: false,
      createdAt: Date.now(),
    })
    return null
  },
})

/** `api.veille.monitor.sourceHealth` : santé des connecteurs (lecture publique). */
export const sourceHealth = query({
  args: {},
  handler: async (ctx): Promise<Doc<'veilleSourceHealth'>[]> => {
    await requireUser(ctx)
    return ctx.db.query('veilleSourceHealth').collect()
  },
})

/** Une capture de la veille, exposée au frontend (section « Captures récentes »). */
export type RecentCapture = {
  _id: Id<'opportunities'>
  title: string
  source?: string
  stage: string
  intent: string
  importedAt?: number
  createdAt: number
}

/** Entonnoir des captures de la veille, compté par stade. */
export type CapturesFunnel = {
  captured: number
  active: number
  won: number
  lost: number
}

/** Stades comptés comme « en cours » dans l'entonnoir. */
const ACTIVE_STAGES = new Set([
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
])

/** Retrouve l'intention (apply/prospect/both) depuis les tags de l'opportunité. */
function intentFromTags(tags: string[]): string {
  if (tags.includes('prospect')) return 'prospect'
  if (tags.includes('both')) return 'both'
  return 'apply'
}

/**
 * `api.veille.monitor.recentCaptures` : opportunités captées par la veille
 * (tag `veille`) du user courant, récentes, avec leur stade actuel — c'est le
 * lien entre une offre détectée et son devenir dans le pipeline. Scopée user.
 */
export const recentCaptures = query({
  args: { limit: v.optional(v.number()) },
  handler: async (
    ctx,
    { limit },
  ): Promise<{ items: RecentCapture[]; funnel: CapturesFunnel }> => {
    const { userId } = await requireUser(ctx)
    const rows = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const captures = rows.filter((o) => o.tags.includes('veille'))

    const funnel: CapturesFunnel = {
      captured: captures.length,
      active: 0,
      won: 0,
      lost: 0,
    }
    for (const o of captures) {
      if (o.stage === 'won') funnel.won += 1
      else if (o.stage === 'lost') funnel.lost += 1
      else if (ACTIVE_STAGES.has(o.stage)) funnel.active += 1
    }

    const items: RecentCapture[] = captures
      .sort(
        (a, b) =>
          (b.importedAt ?? b.createdAt) - (a.importedAt ?? a.createdAt),
      )
      .slice(0, limit ?? 30)
      .map((o) => ({
        _id: o._id,
        title: o.title,
        source: o.source,
        stage: o.stage,
        intent: intentFromTags(o.tags),
        importedAt: o.importedAt,
        createdAt: o.createdAt,
      }))

    return { items, funnel }
  },
})
