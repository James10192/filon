import { Search, X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

/** Un filtre actif representable comme puce retirable. */
export type FilterChip = {
  /** Cle stable (ex. `stage`, `priority`). */
  key: string
  /** Libelle affiche (ex. « Etape : Entretien »). */
  label: string
  /** Retire ce filtre. */
  onRemove: () => void
}

/**
 * Barre de filtres de liste : recherche, controles (selects passes en
 * `children`), puis une rangee de puces de filtres actifs retirables + un
 * bouton « Tout effacer ». Dense, sobre, alignee sur la signature Filon.
 */
export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher...',
  searchLabel = 'Rechercher',
  children,
  actions,
  chips,
  onClearAll,
  className,
}: {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  searchLabel?: string
  children?: React.ReactNode
  /**
   * Actions de droite de la barre (ex. bouton « Exporter (CSV) »). Epinglees a
   * droite sur desktop (`lg:ml-auto`), empilees sous les filtres sur mobile.
   */
  actions?: React.ReactNode
  chips: FilterChip[]
  onClearAll: () => void
  className?: string
}) {
  const hasChips = chips.length > 0

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {onSearchChange && (
          <div className="relative lg:max-w-xs lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label={searchLabel}
            />
          </div>
        )}
        {children && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:w-auto">
            {children}
          </div>
        )}
        {actions && (
          <div className="flex shrink-0 items-center gap-2 lg:ml-auto">
            {actions}
          </div>
        )}
      </div>

      {hasChips && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="group inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface-2 pl-2.5 pr-2 text-xs font-medium text-fg-muted transition-colors hover:border-border-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"
              aria-label={`Retirer le filtre ${chip.label}`}
            >
              {chip.label}
              <X className="size-3 text-fg-subtle transition-colors group-hover:text-fg" />
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-xs text-fg-subtle hover:text-fg"
          >
            Tout effacer
          </Button>
        </div>
      )}
    </div>
  )
}
