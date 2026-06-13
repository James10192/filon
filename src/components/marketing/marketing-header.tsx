import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { KanbanSquare, Menu, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

const NAV = [
  { href: '#fonctionnalites', label: 'Fonctionnalités' },
  { href: '#pour-qui', label: 'Pour qui' },
] as const

/** En-tête public, sticky, sobre. CTA vers /connexion et /inscription. */
export function MarketingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-screen-xl items-center gap-4 px-4 md:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-fg"
          aria-label="Filon, accueil"
        >
          <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
            <KanbanSquare className="size-4.5" />
          </span>
          <span className="text-lg font-semibold tracking-[-0.02em]">
            Filon
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex h-9 items-center rounded-[var(--radius)] px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/connexion">Se connecter</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/inscription">Commencer gratuitement</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t border-border bg-bg md:hidden',
          open ? 'block' : 'hidden',
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center rounded-[var(--radius)] px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            <Button variant="outline" asChild>
              <Link to="/connexion" onClick={() => setOpen(false)}>
                Se connecter
              </Link>
            </Button>
            <Button asChild>
              <Link to="/inscription" onClick={() => setOpen(false)}>
                Commencer gratuitement
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
