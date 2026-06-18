/**
 * Helpers de formatage de dates pour les relances. FR, sans tiret long.
 */

import { m } from '~/lib/paraglide/messages'

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateShortFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
})

const weekdayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Différence en jours entiers entre `iso` et aujourd'hui (négatif = passé). */
export function dayDelta(iso: string): number {
  const due = startOfDay(new Date(iso))
  const today = startOfDay(new Date())
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

/** Date longue, ex. « 14 juin 2026 ». */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

/** Date courte, ex. « 14 juin ». */
export function formatDateShort(iso: string): string {
  return dateShortFmt.format(new Date(iso))
}

/**
 * Libellé relatif sobre, ex. « Aujourd'hui », « Demain », « En retard de 3
 * jours », « Dans 2 jours », « Mardi 14 juin ».
 */
export function relativeLabel(iso: string): string {
  const delta = dayDelta(iso)
  if (delta === 0) return m.dash_relative_today()
  if (delta === 1) return m.dash_relative_tomorrow()
  if (delta === -1) return m.dash_relative_yesterday()
  if (delta < 0) return m.dash_relative_overdue({ n: Math.abs(delta) })
  if (delta < 7) {
    const wd = weekdayFmt.format(new Date(iso))
    return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${formatDateShort(iso)}`
  }
  return formatDate(iso)
}

/** Valeur `yyyy-mm-dd` (locale) pour un `<input type="date">`. */
export function toDateInputValue(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Convertit une valeur `yyyy-mm-dd` d'input en ISO (midi local, stable). */
export function dateInputToIso(value: string): string {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return new Date(value).toISOString()
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}
