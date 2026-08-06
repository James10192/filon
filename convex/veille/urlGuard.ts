import { validationError } from '../lib/plan'

/**
 * Garde anti-SSRF pour les fetch sortants de la veille (`parseSource`).
 *
 * Le vrai risque d'un `fetch(url)` piloté par le client sur notre infra n'est pas
 * un pivot réseau (l'egress Convex est isolé) mais l'usage en proxy ouvert et le
 * ciblage d'endpoints de métadonnées cloud (`169.254.169.254`). On bloque donc :
 *  - tout schéma autre que http(s) (pas de file:, gopher:, data:…) ;
 *  - localhost et les suffixes internes (.localhost / .internal / .local) ;
 *  - les IP littérales privées, loopback, link-local (IPv4 et IPv6).
 *
 * Résidu ASSUMÉ : un hostname public qui résout vers une IP privée (DNS
 * rebinding) n'est pas attrapé — la garde ne fait pas de résolution DNS. Le
 * périmètre d'egress isolé de Convex rend ce résidu acceptable pour la veille.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  'ip6-localhost',
  'metadata',
  'metadata.google.internal',
])

/** Une IPv4 littérale tombe-t-elle dans une plage privée/réservée à bloquer ? */
function isPrivateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return false
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
  // Octet hors bornes → IP malformée, on bloque par principe de précaution.
  if (octets.some((n) => n > 255)) return true
  const [a, b] = octets
  if (a === 0 || a === 10 || a === 127) return true // « ce réseau », privé, loopback
  if (a === 169 && b === 254) return true // link-local (métadonnées cloud)
  if (a === 172 && b >= 16 && b <= 31) return true // privé
  if (a === 192 && b === 168) return true // privé
  if (a >= 224) return true // multicast / réservé
  return false
}

/** Une IPv6 littérale est-elle loopback / unique-local / link-local ? */
function isBlockedIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (h === '::1' || h === '::') return true
  if (h.startsWith('fc') || h.startsWith('fd')) return true // unique local fc00::/7
  if (h.startsWith('fe80')) return true // link-local
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(h)
  if (mapped) return isPrivateIpv4(mapped[1]) // IPv4-mapped
  return false
}

/**
 * Valide qu'une URL fournie par le client est une cible publique http(s)
 * légitime. Throw une `ConvexError` VALIDATION sinon (propagée jusqu'au client).
 */
export function assertPublicHttpUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw validationError('URL invalide.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw validationError('Seules les URLs http(s) sont acceptées.')
  }
  const host = url.hostname.toLowerCase()
  if (
    BLOCKED_HOSTS.has(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    throw validationError('Cette adresse n’est pas autorisée.')
  }
  if (isPrivateIpv4(host) || isBlockedIpv6(host)) {
    throw validationError('Les adresses IP privées ne sont pas autorisées.')
  }
  return url
}

/** Délai maximal d'un fetch de veille (anti-blocage + anti-abus). */
export const VEILLE_FETCH_TIMEOUT_MS = 8000

/** Taille maximale acceptée d'une réponse (anti-amplification). */
export const VEILLE_MAX_BYTES = 2_000_000
