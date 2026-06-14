/**
 * Veille · helpers de parsing purs (aucune API Convex, testables isolément).
 *
 * Responsabilité unique : transformer du HTML ou du texte brut en champs
 * structurés (`ParsedOffer`). Aucune dépendance Node, aucun DOM : regex et
 * manipulation de chaînes uniquement, pour tourner dans n'importe quel runtime
 * et rester unit-testable. Tolérant aux pannes : un champ introuvable vaut
 * `undefined`, jamais une exception.
 */

export type ImportSource = 'educarriere' | 'linkedin' | 'autre' | 'manuel'

export type ParsedOffer = {
  title?: string
  company?: string
  location?: string
  deadline?: string
  description?: string
  keywords: string[]
  source: ImportSource
  sourceUrl?: string
  raw: string
}

const EDUCARRIERE_BASE = 'https://emploi.educarriere.ci'

/** Supprime les diacritiques (matching accent-insensible). */
function deburr(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

/** Retire les balises HTML et normalise les espaces. */
function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Contenu d'une meta `property` ou `name` (og:title, og:description, ...). */
function metaContent(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      'i',
    ),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return stripTags(m[1])
  }
  return undefined
}

function firstTagText(html: string, tag: string): string | undefined {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  const text = m?.[1] ? stripTags(m[1]) : ''
  return text || undefined
}

/** Retire le suffixe de site d'un titre (" | ...", " - ..."). */
function cleanTitle(title: string): string {
  return title.split(/\s+[|\-–]\s+/)[0].trim()
}

/** Détecte la source à partir de l'hôte de l'URL. */
export function detectSource(url?: string): 'educarriere' | 'linkedin' | 'autre' {
  if (!url) return 'autre'
  const lower = url.toLowerCase()
  if (lower.includes('educarriere.ci')) return 'educarriere'
  if (lower.includes('linkedin.com')) return 'linkedin'
  return 'autre'
}

/** Tente de normaliser une date FR en ISO `YYYY-MM-DD`, sinon retourne brut. */
function normalizeDeadline(raw: string): string {
  const trimmed = raw.trim()
  const numeric = trimmed.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (numeric) {
    const [, d, m, y] = numeric
    const year = y.length === 2 ? `20${y}` : y
    const dd = d.padStart(2, '0')
    const mm = m.padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }
  return trimmed
}

const LABEL_PATTERNS = {
  company: /(?:Recruteur|Entreprise|Soci[ée]t[ée])\s*:?\s*([^\n<]{2,80})/i,
  location: /(?:Lieu|Localisation|Ville|R[ée]gion)\s*:?\s*([^\n<]{2,60})/i,
  deadline:
    /(?:Date limite|Cl[ôo]ture|Expire le|Date de cl[ôo]ture|Deadline)\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})/i,
}

/** Détail d'une offre educarriere (page server-rendered). */
export function parseEducarriereDetail(html: string, url: string): ParsedOffer {
  const text = stripTags(html)

  const title =
    metaContent(html, 'og:title') ??
    firstTagText(html, 'h1') ??
    (firstTagText(html, 'title')
      ? cleanTitle(firstTagText(html, 'title')!)
      : undefined)

  const company = text.match(LABEL_PATTERNS.company)?.[1]?.trim()
  const location = text.match(LABEL_PATTERNS.location)?.[1]?.trim()
  const deadlineRaw = text.match(LABEL_PATTERNS.deadline)?.[1]
  const deadline = deadlineRaw ? normalizeDeadline(deadlineRaw) : undefined

  const description =
    metaContent(html, 'og:description') ??
    (text.length > 0 ? text.slice(0, 600) : undefined)

  const offer: ParsedOffer = {
    keywords: extractKeywords(`${title ?? ''} ${description ?? ''}`),
    source: 'educarriere',
    sourceUrl: url,
    raw: text,
  }
  if (title) offer.title = title
  if (company) offer.company = company
  if (location) offer.location = location
  if (deadline) offer.deadline = deadline
  if (description) offer.description = description
  return offer
}

/** Fallback générique (LinkedIn et autres boards) via og: tags + h1/title. */
export function parseGenericHtml(html: string, url: string): ParsedOffer {
  const text = stripTags(html)

  const rawTitle =
    metaContent(html, 'og:title') ??
    firstTagText(html, 'h1') ??
    firstTagText(html, 'title')
  const title = rawTitle ? cleanTitle(rawTitle) : undefined

  const description =
    metaContent(html, 'og:description') ??
    (text.length > 0 ? text.slice(0, 600) : undefined)

  const offer: ParsedOffer = {
    keywords: extractKeywords(`${title ?? ''} ${description ?? ''}`),
    source: detectSource(url) === 'linkedin' ? 'linkedin' : 'autre',
    sourceUrl: url,
    raw: text,
  }
  if (title) offer.title = title
  if (description) offer.description = description
  return offer
}

/** Texte brut collé : 1re ligne = titre, lignes labellisées pour le reste. */
export function parseRawText(text: string): ParsedOffer {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const title = lines[0]

  const company = text.match(LABEL_PATTERNS.company)?.[1]?.trim()
  const location = text.match(LABEL_PATTERNS.location)?.[1]?.trim()
  const deadlineRaw = text.match(LABEL_PATTERNS.deadline)?.[1]
  const deadline = deadlineRaw ? normalizeDeadline(deadlineRaw) : undefined

  const offer: ParsedOffer = {
    keywords: extractKeywords(text),
    source: 'manuel',
    raw: text.trim(),
    description: text.trim(),
  }
  if (title) offer.title = title
  if (company) offer.company = company
  if (location) offer.location = location
  if (deadline) offer.deadline = deadline
  return offer
}

/**
 * Dérive un titre lisible depuis le slug d'une URL educarriere.
 * `.../offre-150716-assistante-marketing.html` -> "Assistante Marketing".
 * Retourne `undefined` si le motif `offre-<digits>-<slug>` est absent.
 */
function titleFromEducarriereSlug(href: string): string | undefined {
  const m = href.match(/offre-\d+-([^/?#]+?)(?:\.html?)?(?:[?#].*)?$/i)
  if (!m?.[1]) return undefined
  const words = m[1]
    .split('-')
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  const title = words.join(' ').trim()
  return title || undefined
}

/** Liste des offres d'une page educarriere : ancres `offre-XXXXX`. */
export function parseEducarriereListing(
  html: string,
): Array<{ title: string; sourceUrl: string }> {
  const re = /<a[^>]+href="([^"]*offre-\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  const seen = new Set<string>()
  const out: Array<{ title: string; sourceUrl: string }> = []

  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const href = match[1]
    const title = titleFromEducarriereSlug(href) ?? stripTags(match[2])
    if (!title) continue
    const sourceUrl = href.startsWith('http')
      ? href
      : `${EDUCARRIERE_BASE}${href.startsWith('/') ? '' : '/'}${href}`
    if (seen.has(sourceUrl)) continue
    seen.add(sourceUrl)
    out.push({ title, sourceUrl })
  }
  return out
}

/** Tokens lowercase (accent-insensibles) pour le matching de mots-clés. */
export function extractKeywords(text: string): string[] {
  return deburr(text.toLowerCase())
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
}

/** True si un mot-clé est sous-chaîne du titre (accent-insensible). */
export function matchesKeywords(title: string, keywords: string[]): boolean {
  const haystack = deburr(title.toLowerCase())
  return keywords.some((kw) => {
    const needle = deburr(kw.toLowerCase()).trim()
    return needle.length > 0 && haystack.includes(needle)
  })
}
