import { Link, useLocation } from '@tanstack/react-router'
import { Plus, type LucideIcon } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { useQuickCapture } from './quick-capture'
import { NAV_ITEMS, isNavItemActive, type NavItem } from './nav-config'

/**
 * Barre de navigation basse, mobile uniquement (`lg:hidden`). La sidebar fixe
 * reste l'unique navigation en desktop. Quatre cibles principales issues de la
 * config de nav partagee + un bouton central « + » (capture rapide). Item actif
 * marque par la veine indigo (icone + label colores en `sidebar-primary`), comme
 * la sidebar. Respecte la zone sure du bas (`env(safe-area-inset-bottom)`).
 */

const BOTTOM_TOS = ['/app', '/app/opportunites', '/app/veille', '/app/propositions']

const BOTTOM_ITEMS: NavItem[] = BOTTOM_TOS.map(
  (to) => NAV_ITEMS.find((item) => item.to === to)!,
).filter(Boolean)

export function MobileBottombar() {
  const location = useLocation()
  const quickCapture = useQuickCapture()

  return (
    <nav
      aria-label={m.bottombar_nav_label()}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-screen-sm items-stretch justify-around px-1">
        {BOTTOM_ITEMS.slice(0, 2).map((item) => (
          <BottomLink
            key={item.to}
            item={item}
            active={isNavItemActive(location.pathname, item)}
          />
        ))}

        <li className="flex items-center">
          <button
            type="button"
            onClick={quickCapture.open}
            aria-label={m.bottombar_new_opportunity()}
            className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-fg shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring active:bg-accent-hover"
          >
            <Plus className="size-5" />
          </button>
        </li>

        {BOTTOM_ITEMS.slice(2, 4).map((item) => (
          <BottomLink
            key={item.to}
            item={item}
            active={isNavItemActive(location.pathname, item)}
          />
        ))}
      </ul>
    </nav>
  )
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon: LucideIcon = item.icon
  return (
    <li className="flex-1">
      <Link
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-14 min-h-11 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors',
          active
            ? 'text-sidebar-primary'
            : 'text-sidebar-foreground/65 hover:text-sidebar-foreground',
        )}
      >
        <Icon className="size-5" />
        <span className="max-w-full truncate px-0.5">{item.label()}</span>
      </Link>
    </li>
  )
}
