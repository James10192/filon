import type { ImportSource } from '../../../convex/veille/parser'

/**
 * Référentiel partagé de la veille : libellés des sources d'import et helpers
 * d'affichage. Garde la copie hors des composants.
 */

export type { ImportSource }

/** Libellés FR des sources d'import. */
export const IMPORT_SOURCE_LABELS: Record<ImportSource, string> = {
  educarriere: 'Educarriere',
  linkedin: 'LinkedIn',
  autre: 'Autre',
  manuel: 'Manuel',
}

/** Hôte lisible d'une URL (sans `www.`), pour l'affichage de provenance. */
export function sourceFromHost(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Timestamp (ms) -> libellé relatif sobre, ex. « il y a 2 h », « hier ». */
export function formatRelativeTime(ms?: number): string {
  if (!ms) return ''
  const diff = Date.now() - ms
  if (diff < 60_000) return "à l'instant"
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  return new Date(ms).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
