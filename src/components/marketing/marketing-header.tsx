import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { KanbanSquare, Menu, LayoutDashboard, Settings, LogOut } from 'lucide-react'
import { authClient, useSession } from '~/lib/auth/auth-client'
import { ThemeToggle } from '~/components/app/theme'
import { LocaleSwitcher } from '~/components/i18n/locale-switcher'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { useScrollState } from './use-scroll-state'

const DOCS_URL = 'https://filon-docs.vercel.app'

function useNav() {
  return [
    { href: '#produit', label: m.nav_product() },
    { href: '#vues', label: m.nav_views() },
    { href: '#tarifs', label: m.nav_pricing() },
  ]
}

/**
 * Defile en douceur vers une ancre. ScrollSmoother detourne le scroll natif :
 * un saut `#hash` ne fonctionne donc pas. On passe par l'instance ScrollSmoother
 * quand elle existe (desktop, non tactile), sinon fallback `scrollIntoView`.
 */
function scrollToAnchor(href: string) {
  if (typeof window === 'undefined') return
  const id = href.replace(/^#/, '')
  const target = document.getElementById(id)
  if (!target) return

  const w = window as typeof window & {
    ScrollSmoother?: { get: () => { scrollTo: (t: Element, smooth: boolean, position?: string) => void } | undefined }
  }
  const smoother = w.ScrollSmoother?.get?.()
  if (smoother) {
    smoother.scrollTo(target, true, 'top top')
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function handleAnchorClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
) {
  e.preventDefault()
  scrollToAnchor(href)
}

/**
 * En-tête public flottant, raffiné (zed-style). Reste HORS du conteneur
 * ScrollSmoother (cf. index.tsx) et `position: fixed` (le `sticky` ne tient pas
 * sous le scroll virtualisé de ScrollSmoother). Façon navbar flottante : se
 * masque en défilant vers le bas, se révèle au moindre défilement vers le haut
 * (état `hidden` via useScrollState). Auth-aware : menu profil si connecté,
 * sinon CTA connexion/inscription.
 */
export function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const { scrolled, hidden } = useScrollState()
  const NAV = useNav()
  const { data: session, isPending } = useSession()
  // Tant que la session n'est pas résolue, on montre l'état déconnecté
  // (évite tout flash de menu profil au SSR).
  const authed = !isPending && Boolean(session)

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={[
        'fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out',
        // On ne masque jamais le header quand le menu mobile est ouvert.
        hidden && !open ? '-translate-y-full' : 'translate-y-0',
        scrolled
          ? 'border-border bg-bg/85 shadow-[0_1px_0_0_var(--color-border),0_8px_24px_-16px_rgba(0,0,0,0.25)]'
          : 'border-transparent bg-bg/50',
      ].join(' ')}
    >
      <div
        className={[
          'mx-auto flex w-full max-w-screen-xl items-center gap-4 px-4 transition-[height] duration-200 ease-out md:px-6 lg:px-8',
          scrolled ? 'h-14' : 'h-16',
        ].join(' ')}
      >
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

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleAnchorClick(e, item.href)}
              className="flex h-9 items-center rounded-[var(--radius)] px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {item.label}
            </a>
          ))}
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center rounded-[var(--radius)] px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {m.nav_docs()}
          </a>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          {authed ? (
            <ProfileMenu session={session!} />
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/connexion">{m.header_login()}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/inscription">{m.cta_start_free()}</Link>
              </Button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 md:hidden">
          <LocaleSwitcher />
          <ThemeToggle />
          <MobileMenu open={open} setOpen={setOpen} authed={authed} />
        </div>
      </div>
    </header>
  )
}

/**
 * Menu mobile en panneau latéral (shadcn Sheet, côté droit). Grandes cibles
 * tactiles (h-12), liens de navigation + CTA auth-aware. Se ferme à la
 * sélection d'un lien.
 */
function MobileMenu({
  open,
  setOpen,
  authed,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  authed: boolean
}) {
  const NAV = useNav()
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={m.header_open_menu()}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(20rem,85vw)] gap-0 p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
              <KanbanSquare className="size-4.5" />
            </span>
            <span className="text-lg font-semibold tracking-[-0.02em] text-fg">
              Filon
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-3 py-4">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                handleAnchorClick(e, item.href)
                setOpen(false)
              }}
              className="flex h-12 items-center rounded-[var(--radius)] px-3 text-base font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {item.label}
            </a>
          ))}
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex h-12 items-center rounded-[var(--radius)] px-3 text-base font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {m.nav_docs()}
          </a>
        </nav>

        <div className="mt-auto flex flex-col gap-2.5 border-t border-border px-5 py-5">
          {authed ? (
            <>
              <Button size="lg" asChild>
                <Link to="/app" onClick={() => setOpen(false)}>
                  Mon espace
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  signOut()
                }}
              >
                Déconnexion
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" variant="outline" asChild>
                <Link to="/connexion" onClick={() => setOpen(false)}>
                  Se connecter
                </Link>
              </Button>
              <Button size="lg" asChild>
                <Link to="/inscription" onClick={() => setOpen(false)}>
                  Commencer gratuitement
                </Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function signOut() {
  void authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = '/'
      },
    },
  })
}

/** Avatar + menu déroulant compte, repris du pattern AccountMenu de /app. */
function ProfileMenu({
  session,
}: {
  session: NonNullable<ReturnType<typeof useSession>['data']>
}) {
  const user = session.user
  const displayName = user?.name?.trim() || user?.email || 'Mon compte'
  const email = user?.email ?? ''

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={displayName}
          className="flex size-9 items-center justify-center rounded-[var(--radius)] transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"
        >
          <Avatar>
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-fg">
            {displayName}
          </span>
          {email && (
            <span className="truncate text-xs font-normal text-fg-subtle">
              {email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app">
            <LayoutDashboard className="size-4" />
            Tableau de bord
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/app/parametres">
            <Settings className="size-4" />
            Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOut className="size-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
