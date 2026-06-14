/**
 * Mémoire de dismissal + cap journalier des nudges (localStorage, sans schéma).
 *
 * Règles :
 * - Un nudge fermé (`dismiss`) ne réapparaît jamais (clé permanente).
 * - Au plus `DAILY_CAP` nudges affichés par jour, tous types confondus.
 * - Un même nudge n'est jamais montré deux fois dans une session (mémoire RAM).
 *
 * Tout est best-effort : si `localStorage` est indisponible (SSR, mode privé),
 * les helpers dégradent proprement (on n'affiche rien plutôt que de planter).
 */

import type { NudgeId } from './conversion'

const DISMISS_KEY = 'filon.upsell.dismissed.v1'
const COUNT_KEY = 'filon.upsell.shown.v1'
/** Nombre maximum de nudges affichés par jour (anti-nag). */
export const DAILY_CAP = 2

/** Nudges déjà affichés dans la session courante (jamais deux fois). */
const shownThisSession = new Set<string>()

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota / mode privé : on ignore, le nudge réapparaîtra simplement plus tard.
  }
}

/** Marque un nudge comme définitivement fermé par l'utilisateur. */
export function dismiss(id: NudgeId): void {
  const set = readJson<string[]>(DISMISS_KEY, [])
  if (set.includes(id)) return
  writeJson(DISMISS_KEY, [...set, id])
}

function isDismissed(id: NudgeId): boolean {
  return readJson<string[]>(DISMISS_KEY, []).includes(id)
}

/** Compteur d'affichages du jour ({ date, n }). */
function shownToday(): number {
  const rec = readJson<{ date: string; n: number }>(COUNT_KEY, {
    date: today(),
    n: 0,
  })
  return rec.date === today() ? rec.n : 0
}

/**
 * Le nudge `id` peut-il être affiché maintenant ? Faux si fermé, déjà vu en
 * session, ou si le cap journalier est atteint.
 */
export function canShowNudge(id: NudgeId): boolean {
  if (typeof window === 'undefined') return false
  if (shownThisSession.has(id)) return false
  if (isDismissed(id)) return false
  if (shownToday() >= DAILY_CAP) return false
  return true
}

/**
 * Enregistre l'affichage d'un nudge (session + compteur du jour). À appeler une
 * seule fois quand le nudge devient visible.
 */
export function markShown(id: NudgeId): void {
  if (shownThisSession.has(id)) return
  shownThisSession.add(id)
  writeJson(COUNT_KEY, { date: today(), n: shownToday() + 1 })
}
