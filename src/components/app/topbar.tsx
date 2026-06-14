import { useLocation } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { Separator } from '~/components/ui/separator'
import { useCommandPalette } from './command-palette'
import { useQuickCapture } from './quick-capture'
import { NAV_ITEMS, isNavItemActive } from './nav-config'

/**
 * Barre superieure de l'espace de travail : declencheur de sidebar (repli
 * desktop + tiroir mobile via le SidebarProvider), titre de la page courante,
 * champ de recherche ouvrant la palette de commandes, et CTA principal.
 *
 * La topbar fait partie de la coquille fixe (le SidebarInset gere le scroll).
 */
export function Topbar() {
  const palette = useCommandPalette()
  const quickCapture = useQuickCapture()
  const location = useLocation()

  const current = NAV_ITEMS.find((item) =>
    isNavItemActive(location.pathname, item),
  )

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur md:px-4">
      <SidebarTrigger className="size-9 text-fg-muted" />
      <Separator orientation="vertical" className="hidden h-5 md:block" />

      <span className="hidden shrink-0 text-sm font-medium text-fg md:inline">
        {current?.label ?? 'Filon'}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {/* Champ de recherche qui ouvre la palette de commandes. */}
        <button
          type="button"
          onClick={palette.open}
          className="flex h-9 w-44 items-center gap-2.5 rounded-[var(--radius)] border border-border bg-bg px-3 text-sm text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] focus-visible:outline-none sm:w-64"
          aria-label="Ouvrir la recherche et les commandes"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="assay hidden shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-subtle sm:inline">
            ⌘K
          </kbd>
        </button>

        <Button
          onClick={quickCapture.open}
          className="hidden sm:inline-flex"
        >
          <Plus className="size-4" />
          Nouvelle opportunité
        </Button>
        <Button
          onClick={quickCapture.open}
          size="icon"
          className="sm:hidden"
          aria-label="Nouvelle opportunité"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </header>
  )
}
