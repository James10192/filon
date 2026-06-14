import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { KanbanSquare, Menu, X, LayoutDashboard, Settings, LogOut } from 'lucide-react'
import { authClient, useSession } from '~/lib/auth/auth-client'
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
import { cn } from '~/lib/utils'

const NAV = [
  { href: '#produit', label: 'Produit' },
  { href: '#vues', label: 'Vues' },
  { href: '#tarifs', label: 'Tarifs' },
] as const

/**
 * En-tête public, sticky, raffiné (zed-style). Reste HORS du conteneur
 * ScrollSmoother (cf. index.tsx) pour rester fixe. Auth-aware : menu profil si
 * connecté, sinon CTA connexion/inscription.
 */
export function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const { data: session, isPending } = useSession()
  // Tant que la session n'est pas résolue, on montre l'état déconnecté
  // (évite tout flash de menu profil au SSR).
  const authed = !isPending && Boolean(session)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/70 backdrop-blur-xl">
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

        <nav className="ml-6 hidden items-center gap-1 md:flex">
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
          {authed ? (
            <ProfileMenu session={session!} />
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/connexion">Se connecter</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/inscription">Commencer gratuitement</Link>
              </Button>
            </>
          )}
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
            {authed ? (
              <>
                <Button asChild>
                  <Link to="/app" onClick={() => setOpen(false)}>
                    Mon espace
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => { setOpen(false); signOut() }}>
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </header>
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
