import type { ImportSource } from '../../../convex/veille/parser'
import { m } from '~/lib/paraglide/messages'
import { getLocale } from '~/lib/paraglide/runtime'

/**
 * Référentiel partagé de la veille : libellés des sources d'import et helpers
 * d'affichage. Garde la copie hors des composants.
 */

export type { ImportSource }

/** Libellé d'une source d'import (évalué à l'appel pour rester réactif i18n). */
export function importSourceLabel(source: ImportSource): string {
  switch (source) {
    case 'educarriere':
      return m.veille_source_educarriere()
    case 'linkedin':
      return m.veille_source_linkedin()
    case 'manuel':
      return m.veille_source_manuel()
    default:
      return m.veille_source_autre()
  }
}

/** Intention d'une veille : que fait-on des détections ? */
export type VeilleIntent = 'apply' | 'prospect' | 'both'

/** Libellé court de l'intention (badge sur la carte de veille). */
export function intentLabel(intent: VeilleIntent): string {
  switch (intent) {
    case 'prospect':
      return m.veille_intent_prospect()
    case 'both':
      return m.veille_intent_both()
    default:
      return m.veille_intent_apply()
  }
}

/** Localisation surveillée : valeur stockée. */
export type VeilleLocation = 'all' | 'abidjan' | 'remote'

/** Libellé d'une localisation (formulaire de veille). */
export function locationLabel(location: VeilleLocation): string {
  switch (location) {
    case 'abidjan':
      return m.veille_location_abidjan()
    case 'remote':
      return m.veille_location_remote()
    default:
      return m.veille_location_all()
  }
}

/** Normalise une valeur stockée vers une localisation connue (défaut `all`). */
export function toVeilleLocation(value?: string): VeilleLocation {
  return value === 'abidjan' || value === 'remote' ? value : 'all'
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
  if (diff < 60_000) return m.veille_time_now()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return m.veille_time_minutes({ n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return m.veille_time_hours({ n: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return m.veille_time_yesterday()
  if (days < 30) return m.veille_time_days({ n: days })
  return new Date(ms).toLocaleDateString(getLocale() === 'en' ? 'en-US' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
