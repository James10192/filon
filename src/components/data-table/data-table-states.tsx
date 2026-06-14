import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '~/components/ui/skeleton'

/**
 * Etats premium partages par les listes (tableau) : squelette de chargement
 * et etat vide concu (icone + copie utile + action), jamais un « aucune
 * donnee » nu. La vue cartes mobile a ses propres squelettes cote appelant.
 */

/** Squelette de tableau dense (en-tete + N lignes) + cartes mobiles. */
export function DataTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {/* Cartes mobile (< md). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4"
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        ))}
      </div>
      {/* Tableau dense (>= md). */}
      <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] md:block">
      <div className="border-b border-border px-3 py-2.5">
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-3 py-3 last:border-0"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="hidden h-6 w-16 rounded-md lg:block" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-6 w-24" />
        </div>
      ))}
      </div>
    </>
  )
}

/** Etat vide concu, centre, avec icone + titre + message + action optionnelle. */
export function DataTableEmpty({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon
  title: string
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        <p className="mx-auto max-w-md text-sm text-fg-muted">{message}</p>
      </div>
      {action}
    </div>
  )
}
