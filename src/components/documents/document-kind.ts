import {
  FileText,
  Mail,
  Briefcase,
  FileSignature,
  File,
  type LucideIcon,
} from 'lucide-react'

/** Types de document, alignes sur le contrat Convex (`DocKind`). */
export type DocKind = 'cv' | 'lettre' | 'portfolio' | 'contrat' | 'autre'

export const DOC_KINDS: DocKind[] = [
  'cv',
  'lettre',
  'portfolio',
  'contrat',
  'autre',
]

/** Libelles FR par type, pour les filtres, chips et toasts. */
export const KIND_LABELS: Record<DocKind, string> = {
  cv: 'CV',
  lettre: 'Lettre',
  portfolio: 'Portfolio',
  contrat: 'Contrat',
  autre: 'Autre',
}

/** Icone lucide associee a chaque type, pour les tuiles et les en-tetes. */
export const KIND_ICONS: Record<DocKind, LucideIcon> = {
  cv: FileText,
  lettre: Mail,
  portfolio: Briefcase,
  contrat: FileSignature,
  autre: File,
}

/**
 * Devine le type le plus probable a partir du nom de fichier (pour
 * pre-selectionner le type au moment de l'upload). Repli sur `autre`.
 */
export function guessKind(filename: string): DocKind {
  const name = filename.toLowerCase()
  if (name.includes('cv') || name.includes('resume')) return 'cv'
  if (name.includes('lettre') || name.includes('motivation')) return 'lettre'
  if (name.includes('portfolio') || name.includes('book')) return 'portfolio'
  if (name.includes('contrat') || name.includes('contract')) return 'contrat'
  return 'autre'
}

/** Formate une taille en octets en libelle lisible (Ko, Mo), ou null. */
export function formatSize(bytes: number | undefined): string | null {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return null
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Ko`
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
}

/** Formate une date ms (epoch) en date courte FR, ou null. */
export function formatCreatedAt(ms: number | undefined): string | null {
  if (ms === undefined || ms === null) return null
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
