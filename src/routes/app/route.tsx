import { useEffect, useState } from 'react'
import {
  Link,
  Outlet,
  createFileRoute,
  useLocation,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router'
import { ConvexProvider } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import {
  LayoutDashboard,
  KanbanSquare,
  Briefcase,
  Building2,
  Send,
  BellRing,
  FileText,
  Settings,
  Menu,
  LogOut,
  Loader2,
} from 'lucide-react'
import { authClient, useSession } from '~/lib/auth/auth-client'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Separator } from '~/components/ui/separator'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

export const Route = createFileRoute('/app')({
  component: AppLayout,
  head: () => ({ meta: [{ title: 'Filon · Espace de travail' }] }),
})

const NAV = [
  { to: '/app', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { to: '/app/pipeline', label: 'Pipeline', icon: KanbanSquare, exact: false },
  { to: '/app/opportunites', label: 'Opportunités', icon: Briefcase, exact: false },
  { to: '/app/entreprises', label: 'Entreprises', icon: Building2, exact: false },
  { to: '/app/propositions', label: 'Propositions', icon: Send, exact: false },
  { to: '/app/relances', label: 'Relances', icon: BellRing, exact: false },
  { to: '/app/documents', label: 'Documents', icon: FileText, exact: false },
  { to: '/app/parametres', label: 'Paramètres', icon: Settings, exact: false },
] as const

function AppLayout() {
  const context = useRouteContext({ from: Route.id })
  return (
    <ConvexProviders client={context.convexQueryClient.convexClient}>
      <AuthGate />
    </ConvexProviders>
  )
}

/**
 * Au SSR et au premier rendu client (hydratation), on utilise un ConvexProvider
 * simple, sûr pour le SSR : il ne déclenche pas les hooks Better Auth qui
 * cassent le rendu serveur (« more than one copy of React »). Une fois monté
 * côté client, on bascule sur le provider authentifié pour que les requêtes
 * disposent du jeton (ctx.auth).
 */
function ConvexProviders({
  client,
  children,
}: {
  client: React.ComponentProps<typeof ConvexProvider>['client']
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <ConvexProvider client={client}>{children}</ConvexProvider>
  }
  return (
    <ConvexBetterAuthProvider client={client} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  )
}

/** Garde d'authentification : redirige vers /connexion si pas de session. */
function AuthGate() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/connexion', replace: true })
    }
  }, [isPending, session, navigate])

  if (isPending) return <ShellSkeleton />
  if (!session) return null

  const user = session.user
  const displayName = user?.name?.trim() || user?.email || 'Mon compte'
  const email = user?.email ?? ''

  return <AppShell displayName={displayName} email={email} />
}

function AppShell({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  return (
    <div className="flex min-h-[100dvh] bg-bg">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <Brand />
        <Separator />
        <SidebarNav className="flex-1 overflow-y-auto p-3" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar displayName={displayName} email={email} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <Link
      to="/app"
      className="flex h-16 items-center gap-2.5 px-5 text-fg"
      aria-label="Filon, tableau de bord"
    >
      <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
        <KanbanSquare className="size-4.5" />
      </span>
      <span className="text-lg font-semibold tracking-[-0.02em]">Filon</span>
    </Link>
  )
}

function SidebarNav({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const location = useLocation()
  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {NAV.map(({ to, label, icon: Icon, exact }) => {
        const active = exact
          ? location.pathname === to
          : location.pathname === to ||
            location.pathname.startsWith(`${to}/`)
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              'flex h-11 items-center gap-3 rounded-[var(--radius)] px-3 text-sm font-medium transition-colors',
              active
                ? 'bg-accent-soft text-accent'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-4.5 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function Topbar({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur md:px-6">
      <MobileNav />
      <div className="flex-1" />
      <AccountMenu displayName={displayName} email={email} />
    </header>
  )
}

function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Brand />
        <Separator />
        <SidebarNav className="p-3" onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

function AccountMenu({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  async function logout() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/'
        },
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-11 items-center gap-2.5 rounded-[var(--radius)] pl-1.5 pr-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"
        >
          <Avatar>
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-col sm:flex">
            <span className="truncate text-sm font-medium text-fg">
              {displayName}
            </span>
            {email && (
              <span className="truncate text-xs text-fg-subtle">{email}</span>
            )}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/parametres">
            <Settings className="size-4" />
            Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut className="size-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-[100dvh] bg-bg">
      <aside className="hidden w-64 shrink-0 flex-col gap-2 border-r border-border bg-surface p-3 lg:flex">
        <Skeleton className="mb-2 h-10 w-32" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
          <Skeleton className="h-9 w-9 lg:hidden" />
          <div className="flex-1" />
          <Skeleton className="h-11 w-40" />
        </header>
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-accent" />
        </main>
      </div>
    </div>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
