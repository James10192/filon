import { useEffect, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Row,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { cn } from '~/lib/utils'

/**
 * Tableau dense generique (style Linear / Attio) bati sur TanStack Table +
 * la primitive shadcn Table. Tri par colonne, en-tete collant, survol de
 * ligne, navigation clavier (haut/bas + Entree), clic ligne -> onRowClick.
 *
 * Volontairement minimal : pas de pagination cote serveur (les volumes par
 * user restent modestes, tri/filtre en memoire). Le rendu cartes mobile est
 * delegue a l'appelant (les listes ont des cartes specifiques au domaine).
 */
export function DataTable<TData>({
  data,
  columns,
  defaultSorting,
  onRowClick,
  getRowId,
  selectedRowId,
  minWidthClassName = 'min-w-[860px]',
  ariaLabel,
}: {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  defaultSorting?: SortingState
  onRowClick?: (row: TData) => void
  getRowId?: (row: TData) => string
  /** Id de la ligne sélectionnée (panneau split) : marquée d'une veine accent. */
  selectedRowId?: string
  minWidthClassName?: string
  ariaLabel: string
}) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting ?? [])
  const [activeIndex, setActiveIndex] = useState(-1)
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  })

  const rows = table.getRowModel().rows

  function handleKeyDown(e: React.KeyboardEvent) {
    if (rows.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      onRowClick?.(rows[activeIndex].original)
    }
  }

  useEffect(() => {
    if (activeIndex < 0 || !bodyRef.current) return
    const row = bodyRef.current.querySelectorAll('tr')[activeIndex]
    row?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <div
      className="overflow-x-auto overflow-y-visible rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]"
      tabIndex={0}
      role="grid"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      <Table className={minWidthClassName}>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow
              key={group.id}
              className="border-b border-border hover:bg-transparent"
            >
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'sticky top-0 z-10 h-9 bg-surface px-3 text-left align-middle',
                    header.column.columnDef.meta?.headerClassName,
                  )}
                  style={{ width: header.getSize() || undefined }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody ref={bodyRef}>
          {rows.map((row, index) => (
            <DataRow
              key={row.id}
              row={row}
              active={index === activeIndex}
              selected={selectedRowId !== undefined && row.id === selectedRowId}
              onActivate={() => setActiveIndex(index)}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DataRow<TData>({
  row,
  active,
  selected,
  onActivate,
  onClick,
}: {
  row: Row<TData>
  active: boolean
  selected?: boolean
  onActivate: () => void
  onClick?: () => void
}) {
  return (
    <TableRow
      role="row"
      aria-selected={selected || active}
      data-state={selected || active ? 'selected' : undefined}
      onMouseEnter={onActivate}
      onClick={onClick}
      className={cn(
        'group border-b border-border transition-colors last:border-0 hover:bg-surface-2',
        onClick && 'cursor-pointer',
        active && !selected && 'bg-surface-2',
        // Accent gauche via box-shadow inset (PAS position:relative sur le <tr> :
        // relative sur une ligne de tableau dans un conteneur overflow-x décale
        // les cellules sous Chrome — cellule « vide » / contenu poussé à droite).
        selected &&
          'bg-accent-soft/50 shadow-[inset_2px_0_0_0_var(--color-accent)]',
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn('px-3 py-2.5 align-middle', cell.column.columnDef.meta?.cellClassName)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}
