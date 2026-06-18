/**
 * Generateur CSV minimal, pur, sans dependance lourde.
 *
 * Genere un CSV a partir de donnees deja chargees cote client puis declenche le
 * telechargement via un `Blob` (aucun appel reseau, aucune librairie tierce).
 *
 * Choix de format pense pour Excel / LibreOffice en contexte francophone :
 * - separateur point-virgule (`;`) : Excel FR attend `;`, pas la virgule.
 * - BOM UTF-8 en tete : sans lui, Excel Windows casse les accents (« é » -> « Ã© »).
 * - CRLF en fin de ligne : convention CSV (RFC 4180), robuste sous Windows.
 */

/** Une colonne du CSV : entete affiche + extracteur de valeur depuis une ligne. */
export type CsvColumn<T> = {
  /** Entete de colonne (libelle FR lisible). */
  header: string
  /** Extrait la valeur brute de la ligne (string, number, boolean, null...). */
  value: (row: T) => string | number | boolean | null | undefined
}

const SEPARATOR = ';'
const NEWLINE = '\r\n'
const BOM = '﻿'

/**
 * Echappe une cellule selon RFC 4180 : entoure de guillemets si elle contient
 * le separateur, un guillemet, ou un saut de ligne ; double les guillemets
 * internes. Les valeurs vides deviennent une chaine vide.
 */
function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str === '') return ''
  const needsQuoting =
    str.includes(SEPARATOR) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  if (!needsQuoting) return str
  return `"${str.replace(/"/g, '""')}"`
}

/** Construit le texte CSV complet (BOM + entetes + lignes). */
export function buildCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(SEPARATOR)
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(SEPARATOR),
  )
  return BOM + [headerLine, ...dataLines].join(NEWLINE) + NEWLINE
}

/**
 * Declenche le telechargement d'un texte CSV sous le nom donne. No-op cote
 * serveur (garde SSR). Revoque l'URL objet apres le clic pour liberer la memoire.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Laisse le navigateur demarrer le telechargement avant de revoquer l'URL.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Nom de fichier date et stable : `filon-<base>-AAAA-MM-JJ.csv`. La date locale
 * (fuseau de l'utilisateur) suffit pour un export ponctuel.
 */
export function csvFilename(base: string): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `filon-${base}-${yyyy}-${mm}-${dd}.csv`
}

/**
 * Raccourci complet : construit le CSV depuis les lignes deja chargees et lance
 * le telechargement. Retourne le nombre de lignes exportees (pour un toast).
 */
export function exportCsv<T>(
  base: string,
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
): number {
  const csv = buildCsv(rows, columns)
  downloadCsv(csvFilename(base), csv)
  return rows.length
}
