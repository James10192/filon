'use node'

import { v } from 'convex/values'
import { action, internalAction } from '../_generated/server'
import { internal } from '../_generated/api'
import { requireUserFromAction } from '../lib/withUser'
import {
  CONNECTORS,
  CONNECTOR_IDS,
  CONNECTOR_META,
  type Listing,
} from './connectors'
import type { Id } from '../_generated/dataModel'
import {
  detectSource,
  matchesSearch,
  parseEducarriereDetail,
  parseGenericHtml,
  parseRawText,
  type ParsedOffer,
} from './parser'
import type { MonitorSearch } from './monitor'
import type { ActionCtx } from '../_generated/server'

/**
 * Veille · accès HTTP sortant (runtime Node).
 *
 * - `parseSource` (public) : aperçu d'une URL/texte collé, aucune écriture DB.
 * - `runMonitor` (internal, cron) : itère TOUS les connecteurs et toutes les
 *   veilles auto, importe les correspondances (dédupliquées).
 * - `runNow` (public) : déclenchement manuel pour le user courant — c'est aussi
 *   LA veille des comptes gratuits (auto désactivée pour eux).
 */

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function browserHeaders(): Record<string, string> {
  return { 'User-Agent': BROWSER_UA, 'Accept-Language': 'fr-FR,fr;q=0.9' }
}

type ListingsByConnector = Map<string, Listing[]>

/** Santé + volume listé d'un connecteur sur un passage (pour le récap UI). */
export type SourceScan = { id: string; ok: boolean; scanned: number }

/** Résultat de `fetchAllListings` : listings indexés + scan par connecteur. */
type FetchResult = { byConnector: ListingsByConnector; scans: SourceScan[] }

/**
 * Récupère la liste de chaque connecteur et journalise sa santé (succès, nombre
 * d'offres, ou erreur). Un connecteur en panne n'interrompt pas les autres.
 */
type ConnectorResult =
  | { id: string; listings: Listing[]; ok: true; count: number }
  | { id: string; listings: Listing[]; ok: false; error: string }

async function fetchAllListings(ctx: ActionCtx): Promise<FetchResult> {
  // Fetch + parse de chaque connecteur EN PARALLÈLE (latence = max, pas somme).
  const results: ConnectorResult[] = await Promise.all(
    CONNECTORS.map(async (c): Promise<ConnectorResult> => {
      try {
        const res = await fetch(c.listingUrl, { headers: browserHeaders() })
        if (!res.ok) {
          return { id: c.id, listings: [], ok: false, error: `HTTP ${res.status}` }
        }
        const listings = c.parse(await res.text())
        return { id: c.id, listings, ok: true, count: listings.length }
      } catch (e) {
        return {
          id: c.id,
          listings: [],
          ok: false,
          error: e instanceof Error ? e.message.slice(0, 200) : 'fetch_error',
        }
      }
    }),
  )

  const byConnector: ListingsByConnector = new Map()
  await Promise.all(
    results.map((r) => {
      byConnector.set(r.id, r.listings)
      return ctx.runMutation(internal.veille.monitor.recordSourceHealth, {
        connectorId: r.id,
        ok: r.ok,
        ...(r.ok ? { count: r.count } : { error: r.error }),
      })
    }),
  )

  const scans: SourceScan[] = results.map((r) => ({
    id: r.id,
    ok: r.ok,
    scanned: r.listings.length,
  }))
  return { byConnector, scans }
}

/** Une offre RÉELLEMENT créée durant un passage (pour le récap UI). */
export type RunCapture = {
  opportunityId: Id<'opportunities'>
  title: string
  source: string
  intent: 'apply' | 'prospect' | 'both'
}

/** Plafond de captures détaillées remontées au client (le reste reste compté). */
const MAX_CAPTURES = 50

/**
 * Confronte chaque veille aux offres listées (sur ses sources ciblées) et importe
 * les correspondances. Notifie si la veille le demande. Retourne le total importé
 * et le détail des offres créées (titre, source, intention) plafonné pour le récap.
 */
async function applySearches(
  ctx: ActionCtx,
  searches: MonitorSearch[],
  byConnector: ListingsByConnector,
): Promise<{ imported: number; captures: RunCapture[] }> {
  let totalImported = 0
  const captures: RunCapture[] = []
  for (const search of searches) {
    const targets = search.sources ?? CONNECTOR_IDS
    let count = 0
    for (const cid of targets) {
      for (const listing of byConnector.get(cid) ?? []) {
        if (!matchesSearch(listing.title, search.include, search.exclude)) {
          continue
        }
        const opportunityId = await ctx.runMutation(
          internal.veille.monitor.importFromMonitor,
          {
            userId: search.userId,
            title: listing.title,
            sourceUrl: listing.sourceUrl,
            connectorId: cid,
            intent: search.intent,
          },
        )
        if (opportunityId) {
          count += 1
          if (captures.length < MAX_CAPTURES) {
            captures.push({
              opportunityId,
              title: listing.title,
              source: cid,
              intent: search.intent,
            })
          }
        }
      }
    }
    await ctx.runMutation(internal.veille.monitor.markRun, {
      searchId: search._id,
      count,
    })
    if (count > 0 && search.notify) {
      await ctx.runMutation(internal.veille.monitor.notifyVeilleImport, {
        userId: search.userId,
        count,
        searchLabel: search.label,
      })
    }
    totalImported += count
  }
  return { imported: totalImported, captures }
}

/**
 * Analyse une source (URL ou texte collé) et retourne les champs structurés.
 * Aucune écriture DB : aperçu seul, le client appelle ensuite `opportunities.create`.
 */
export const parseSource = action({
  args: { url: v.optional(v.string()), text: v.optional(v.string()) },
  handler: async (
    _ctx,
    args,
  ): Promise<ParsedOffer & { partial?: boolean; error?: string }> => {
    if (args.text && args.text.trim().length > 0) {
      return parseRawText(args.text)
    }
    const url = args.url?.trim()
    if (!url) return { source: 'manuel', keywords: [], raw: '', partial: true }

    const src = detectSource(url)
    try {
      const res = await fetch(url, { headers: browserHeaders() })
      if (!res.ok) {
        return {
          source: src,
          sourceUrl: url,
          keywords: [],
          raw: '',
          partial: true,
          error: 'fetch_blocked',
        }
      }
      const html = await res.text()
      const parsed =
        src === 'educarriere'
          ? parseEducarriereDetail(html, url)
          : parseGenericHtml(html, url)
      return { ...parsed, sourceUrl: url, partial: !parsed.title }
    } catch {
      return {
        source: src,
        sourceUrl: url,
        keywords: [],
        raw: '',
        partial: true,
        error: 'fetch_blocked',
      }
    }
  },
})

/**
 * Moniteur multi-sources · exécuté par le cron uniquement. Récupère chaque
 * connecteur, matche les listings contre les veilles auto, importe (dédupliqué).
 */
export const runMonitor = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const { byConnector } = await fetchAllListings(ctx)
    const total = [...byConnector.values()].reduce((s, l) => s + l.length, 0)
    if (total === 0) return
    const searches = await ctx.runQuery(
      internal.veille.monitor.enabledSearches,
      {},
    )
    await applySearches(ctx, searches, byConnector)
  },
})

/** Cooldown anti-abus du déclenchement manuel (90 s). */
const RUN_NOW_COOLDOWN_MS = 90_000

/** Source analysée durant un passage (état + volume), enrichie du libellé. */
export type RunSource = { id: string; label: string; ok: boolean; scanned: number }

/** Résumé riche d'un passage manuel, consommé par le panneau de run. */
export type RunNowResult = {
  imported: number
  throttled?: boolean
  retryInSec?: number
  sources: RunSource[]
  captures: RunCapture[]
}

/** Libellé lisible d'un connecteur (depuis CONNECTOR_META, défaut = id). */
function connectorLabel(id: string): string {
  return CONNECTOR_META.find((c) => c.id === id)?.label ?? id
}

/**
 * `api.veille.actions.runNow` : lance la veille à la demande pour le user courant
 * (toutes ses veilles actives). Ouvert à tous les paliers (= veille manuelle des
 * comptes gratuits). Cooldown 90 s pour ne pas marteler les sources. Retourne un
 * résumé riche (sources analysées + offres captées) pour le panneau de run.
 */
export const runNow = action({
  args: {},
  handler: async (ctx): Promise<RunNowResult> => {
    const { userId } = await requireUserFromAction(ctx)
    const { searches, lastRun } = await ctx.runQuery(
      internal.veille.monitor.userEnabledSearches,
      { userId },
    )
    if (searches.length === 0) {
      return { imported: 0, sources: [], captures: [] }
    }

    const since = Date.now() - lastRun
    if (lastRun > 0 && since < RUN_NOW_COOLDOWN_MS) {
      return {
        imported: 0,
        throttled: true,
        retryInSec: Math.ceil((RUN_NOW_COOLDOWN_MS - since) / 1000),
        sources: [],
        captures: [],
      }
    }

    const { byConnector, scans } = await fetchAllListings(ctx)
    const { imported, captures } = await applySearches(
      ctx,
      searches,
      byConnector,
    )
    const sources: RunSource[] = scans.map((s) => ({
      id: s.id,
      label: connectorLabel(s.id),
      ok: s.ok,
      scanned: s.scanned,
    }))
    return { imported, sources, captures }
  },
})
