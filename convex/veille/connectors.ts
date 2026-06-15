/**
 * Veille · registre des connecteurs de sources (pluggable).
 *
 * Un connecteur = une source auto-surveillable : une URL de liste + un parser
 * PUR (regex, aucune dépendance Node ni DOM) qui en extrait les offres. Ajouter
 * une source = ajouter une entrée ici, rien d'autre à toucher (le moniteur itère
 * `CONNECTORS`). Les parsers sont validés sur le HTML réel des sites (2026-06-15).
 *
 * Sources NON auto (LinkedIn, Indeed, agrégateurs à auth/JS) : volontairement
 * absentes — elles passent par l'import manuel (`parseSource` dans actions.ts).
 */
import { parseEducarriereListing, slugToTitle } from './parser'

// Note : emploi.ci a été écarté du registre auto. Sa page liste répond 200 depuis
// un poste classique mais 403 depuis l'IP sortante de Convex (filtrage anti-bot
// côté serveur). Il reste couvert par l'import manuel (coller l'URL). Le tracking
// de santé l'aurait affiché « en panne » en permanence : on ne ship que ce qui
// marche réellement depuis le runtime de prod.
export type ConnectorId = 'educarriere' | 'novojob'

export type Listing = { title: string; sourceUrl: string }

export type Connector = {
  id: ConnectorId
  label: string
  /** Hôte affiché (badge source sur la fiche opportunité). */
  host: string
  /** Page liste à récupérer à chaque passage. */
  listingUrl: string
  /** Liste -> offres. Pur, testable isolément. */
  parse: (html: string) => Listing[]
}

const NOVOJOB_BASE = 'https://www.novojob.com'

/** Déduplique par URL et écarte les titres vides. */
function dedupe(items: Listing[]): Listing[] {
  const seen = new Set<string>()
  const out: Listing[] = []
  for (const it of items) {
    if (!it.title || seen.has(it.sourceUrl)) continue
    seen.add(it.sourceUrl)
    out.push(it)
  }
  return out
}

/** Novojob : ancres `.../offre-d-emploi/cote-d-ivoire/{id}-{slug}` (id en tête). */
function parseNovojob(html: string): Listing[] {
  const re =
    /href="((?:https?:\/\/[^"]*)?\/cote-d-ivoire\/offres-d-emploi\/offre-d-emploi\/cote-d-ivoire\/(\d+)-([a-z0-9-]+))"/gi
  const out: Listing[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const href = m[1]
    const sourceUrl = href.startsWith('http') ? href : `${NOVOJOB_BASE}${href}`
    out.push({ title: slugToTitle(m[3]), sourceUrl })
  }
  return dedupe(out)
}

export const CONNECTORS: ReadonlyArray<Connector> = [
  {
    id: 'educarriere',
    label: 'educarriere',
    host: 'emploi.educarriere.ci',
    listingUrl: 'https://emploi.educarriere.ci/nos-offres',
    parse: (html) => parseEducarriereListing(html),
  },
  {
    id: 'novojob',
    label: 'Novojob',
    host: 'www.novojob.com',
    listingUrl: 'https://www.novojob.com/cote-d-ivoire/offres-d-emploi',
    parse: parseNovojob,
  },
]

export const CONNECTOR_IDS: ReadonlyArray<ConnectorId> = CONNECTORS.map(
  (c) => c.id,
)

/**
 * Métadonnées partagées avec le frontend (sélection de sources, panneau santé).
 * Dérivées de `CONNECTORS` (source unique) en omettant les parsers non
 * sérialisables : pas de liste parallèle à maintenir.
 */
export const CONNECTOR_META: ReadonlyArray<{
  id: ConnectorId
  label: string
  host: string
}> = CONNECTORS.map(({ id, label, host }) => ({ id, label, host }))

/** Vrai si l'id correspond à un connecteur auto connu. */
export function isConnectorId(id: string): id is ConnectorId {
  return CONNECTORS.some((c) => c.id === id)
}
