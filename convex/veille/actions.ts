'use node'

import { v } from 'convex/values'
import { action, internalAction } from '../_generated/server'
import { internal } from '../_generated/api'
import {
  detectSource,
  matchesKeywords,
  parseEducarriereDetail,
  parseEducarriereListing,
  parseGenericHtml,
  parseRawText,
  type ParsedOffer,
} from './parser'

/**
 * Veille · accès HTTP sortant (runtime Node).
 *
 * Responsabilité unique : récupérer des pages externes et déléguer le parsing
 * aux helpers purs de `parser.ts`. `parseSource` ne fait aucune écriture DB
 * (preview seul) → exposable sans risque. `runMonitor` est `internal` (cron).
 */

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const EDUCARRIERE_LISTING = 'https://emploi.educarriere.ci/nos-offres'

/** En-têtes "navigateur réaliste" pour limiter les blocages. */
function browserHeaders(): Record<string, string> {
  return {
    'User-Agent': BROWSER_UA,
    'Accept-Language': 'fr-FR,fr;q=0.9',
  }
}

/**
 * Analyse une source (URL ou texte collé) et retourne les champs structurés.
 * Aucune écriture DB : c'est un aperçu, le client appelle ensuite
 * `api.opportunities.create`. Dégrade gracieusement : sur échec réseau / non-200
 * renvoie un résultat `partial` toujours exploitable côté client.
 */
export const parseSource = action({
  args: {
    url: v.optional(v.string()),
    text: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    args,
  ): Promise<ParsedOffer & { partial?: boolean; error?: string }> => {
    // Texte collé prioritaire : pas de fetch.
    if (args.text && args.text.trim().length > 0) {
      return parseRawText(args.text)
    }

    const url = args.url?.trim()
    if (!url) {
      return { source: 'manuel', keywords: [], raw: '', partial: true }
    }

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
 * Moniteur educarriere · exécuté par le cron uniquement.
 * Récupère la page d'offres, matche chaque listing contre les recherches
 * actives de tous les users, importe (avec déduplication) les correspondances.
 * Sur échec réseau : sortie silencieuse, la prochaine exécution réessaie.
 */
export const runMonitor = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    let html: string
    try {
      const res = await fetch(EDUCARRIERE_LISTING, { headers: browserHeaders() })
      if (!res.ok) return
      html = await res.text()
    } catch {
      return
    }

    const listings = parseEducarriereListing(html)
    if (listings.length === 0) return

    const searches = await ctx.runQuery(
      internal.veille.monitor.enabledSearches,
      {},
    )

    for (const search of searches) {
      let count = 0
      for (const listing of listings) {
        if (!matchesKeywords(listing.title, search.keywords)) continue
        const created = await ctx.runMutation(
          internal.veille.monitor.importFromMonitor,
          {
            userId: search.userId,
            title: listing.title,
            sourceUrl: listing.sourceUrl,
          },
        )
        if (created) count += 1
      }
      await ctx.runMutation(internal.veille.monitor.markRun, {
        searchId: search._id,
        count,
      })
    }
  },
})
