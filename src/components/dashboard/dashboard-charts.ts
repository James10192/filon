/**
 * Helpers de dataviz partagés du tableau de bord (séries, deltas, formats).
 * Garde les composants visuels légers : pas de logique de calcul inline.
 */

export type Trend = {
  weeks: number
  opportunities: number[]
  won: number[]
  proposals: number[]
  activities: number[]
}

/** Point d'une mini-série pour recharts (index hebdomadaire + valeur). */
export type SparkPoint = { i: number; v: number }

/** Transforme une série brute (number[]) en points recharts. */
export function toSparkPoints(series: number[] | undefined): SparkPoint[] {
  if (!series || series.length === 0) return []
  return series.map((v, i) => ({ i, v }))
}

/**
 * Variation entre la dernière semaine et la moyenne des semaines précédentes
 * (hors dernière). Renvoie un ratio signé (ex. +0.5 = +50 %), ou null si la
 * base est nulle (pas de référence pour comparer).
 */
export function trendDelta(series: number[] | undefined): number | null {
  if (!series || series.length < 2) return null
  const last = series[series.length - 1]
  const prior = series.slice(0, -1)
  const base = prior.reduce((s, n) => s + n, 0) / prior.length
  if (base === 0) return last > 0 ? 1 : 0
  return (last - base) / base
}

/** Somme d'une série (total sur la fenêtre). */
export function sumSeries(series: number[] | undefined): number {
  if (!series) return 0
  return series.reduce((s, n) => s + n, 0)
}

/** Formate un delta signé en libellé court FR (ex. « +24 % », « stable »). */
export function formatDelta(delta: number | null): string {
  if (delta === null) return 'nouveau'
  const pct = Math.round(delta * 100)
  if (pct === 0) return 'stable'
  return `${pct > 0 ? '+' : ''}${pct} %`
}
