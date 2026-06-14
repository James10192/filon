import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '~/lib/utils'

/**
 * En-tete de colonne triable, branche sur l'API de tri TanStack Table.
 * Style "eyebrow" sobre + fleche de direction. Non triable -> simple label.
 */
export function SortableHeader<TData, TValue>({
  column,
  label,
  className,
}: {
  column: Column<TData, TValue>
  label: string
  className?: string
}) {
  if (!column.getCanSort()) {
    return <span className={cn('eyebrow', className)}>{label}</span>
  }

  const sorted = column.getIsSorted()

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'eyebrow inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]',
        sorted && 'text-fg',
        className,
      )}
      aria-label={`Trier par ${label}`}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="size-3" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3" />
      ) : (
        <ChevronsUpDown className="size-3 opacity-40" />
      )}
    </button>
  )
}
