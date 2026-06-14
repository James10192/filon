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
import { useQuery } from 'convex/react'
import {
  LayoutDashboard,
  KanbanSquare,
  Briefcase,
  Rss,
  Building2,
  Send,
  BellRing,
  FileText,
  Settings,
  Menu,
  LogOut,
  Loader2,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import { ThemeProvider, ThemeToggle } from '~/components/app/theme'
import {
  QuickCaptureProvider,
  useQuickCapture,
} from '~/components/app/quick-capture'
import {
  CommandPaletteProvider,
  useCommandPalette,
} from '~/components/app/command-palette'

export const Route = createFileRoute('/app')({
  component: AppLayout,
  head: () => ({ meta: [{ title: 'Filon · Espace de travail' }] }),
})

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  exact: boolean
}

/** Navigation regroupee par domaine, avec petits intitules mono. */
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '/app', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      { to: '/app/pipeline', label: 'Pipeline', icon: KanbanSquare, exact: false },
      { to: '/app/opportunites', label: 'Opportunités', icon: Briefcase, exact: false },
      { to: '/app/veille', label: 'Veille', icon: Rss, exact: false },
    ],
  },
  {
    title: 'Carnet',
    items: [
      { to: '/app/entreprises', label: 'Entreprises', icon: Building2, exact: false },
      { to: '/app/propositions', label: 'Propositions', icon: Send, exact: false },
      { to: '/app/relances', label: 'Relances', icon: BellRing, exact: false },
      { to: '/app/documents', label: 'Documents', icon: FileText, exact: false },
    ],
  },
  {
    title: 'Réglages',
    items: [
      { to: '/app/parametres', label: 'Paramètres', icon: Settings, exact: false },
    ],
  },
]

// ===========================================================================
// Logique d'authentification : NE PAS MODIFIER (SSR + Better Auth fragiles).
// AppLayout -> ConvexProviders -> AuthGate -> AppShell.
// ===========================================================================

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

// ===========================================================================
// Coquille visuelle (libre de restructuration). Les providers Theme / Quick
// Capture / Command Palette sont montes ICI, dans la zone authentifiee (apres
// AuthGate + ConvexProviders), jamais dans __root.tsx.
// ===========================================================================

function AppShell({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  return (
    <ThemeProvider>
      <QuickCaptureProvider>
        <CommandPaletteProvider>
          <ShellLayout displayName={displayName} email={email} />
        </CommandPaletteProvider>
      </QuickCaptureProvider>
    </ThemeProvider>
  )
}

const COLLAPSE_KEY = 'filon-sidebar-collapsed'

/**
 * Etat replie/etendu de la sidebar, persiste dans localStorage.
 * Defaut etendu au SSR (false) ; on lit la valeur stockee au mount pour
 * eviter tout mismatch d'hydratation.
 */
function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      /* localStorage indisponible : on garde le defaut etendu. */
    }
  }, [])
  const toggle = () =>
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  return { collapsed, toggle }
}

function ShellLayout({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  useGlobalShortcuts()
  const { collapsed, toggle } = useSidebarCollapsed()

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <div className="min-h-[100dvh] bg-bg">
        {/* Sidebar fixe (lg+), independante du scroll. */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex',
            collapsed ? 'w-[4.25rem]' : 'w-64',
          )}
        >
          <Brand collapsed={collapsed} />
          <div className={cn('pb-2', collapsed ? 'px-2.5' : 'px-3')}>
            <NewOpportunityButton
              collapsed={collapsed}
              className={collapsed ? 'w-full justify-center px-0' : 'w-full justify-start'}
            />
          </div>
          <SidebarNav
            collapsed={collapsed}
            className={cn(
              'flex-1 overflow-y-auto pb-3',
              collapsed ? 'px-2.5' : 'px-3',
            )}
          />
          <SidebarFooter
            displayName={displayName}
            email={email}
            collapsed={collapsed}
            onToggle={toggle}
          />
        </aside>

        {/* Topbar fixe, calee a droite de la sidebar. */}
        <Topbar
          displayName={displayName}
          email={email}
          collapsed={collapsed}
        />

        {/* Contenu : decale sous la topbar et a droite de la sidebar. */}
        <main
          className={cn(
            'pt-16 transition-[padding] duration-200',
            collapsed ? 'lg:pl-[4.25rem]' : 'lg:pl-64',
          )}
        >
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 md:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}

/** Cmd+K / Ctrl+K ouvre la palette ; « n » ouvre la capture rapide. */
function useGlobalShortcuts() {
  const palette = useCommandPalette()
  const quickCapture = useQuickCapture()

  useEffect(() => {
    function isEditable(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      )
    }

    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault()
        palette.toggle()
        return
      }
      // « n » seul (sans modificateur), hors champ de saisie.
      if (
        key === 'n' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditable(event.target)
      ) {
        event.preventDefault()
        quickCapture.open()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [palette, quickCapture])
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      to="/app"
      className={cn(
        'flex h-16 shrink-0 items-center gap-2.5 text-fg',
        collapsed ? 'justify-center px-0' : 'px-5',
      )}
      aria-label="Filon, tableau de bord"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
        <KanbanSquare className="size-4.5" />
      </span>
      {!collapsed && (
        <span className="text-lg font-semibold tracking-[-0.02em]">Filon</span>
      )}
    </Link>
  )
}

/** Bouton « + Nouvelle opportunité » (ouvre la capture rapide). */
function NewOpportunityButton({
  className,
  collapsed = false,
}: {
  className?: string
  collapsed?: boolean
}) {
  const quickCapture = useQuickCapture()
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={quickCapture.open}
            size="icon"
            className={className}
            aria-label="Nouvelle opportunité"
          >
            <Plus className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Nouvelle opportunité</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Button onClick={quickCapture.open} className={className}>
      <Plus className="size-4" />
      Nouvelle opportunité
    </Button>
  )
}

function SidebarNav({
  className,
  onNavigate,
  collapsed = false,
}: {
  className?: string
  onNavigate?: () => void
  collapsed?: boolean
}) {
  const location = useLocation()
  // Badges live : relances en retard (danger) sinon a venir (accent).
  const summary = useQuery(api.dashboard.summary, {})

  function badgeFor(to: string): React.ReactNode {
    if (to !== '/app/relances' || !summary) return null
    const overdue = summary.followupsOverdue ?? 0
    const upcoming = summary.followupsUpcoming ?? 0
    if (overdue > 0) return <NavBadge tone="danger">{overdue}</NavBadge>
    if (upcoming > 0) return <NavBadge tone="accent">{upcoming}</NavBadge>
    return null
  }

  return (
    <nav className={cn('flex flex-col gap-4', className)}>
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          {collapsed ? (
            <div
              className="mx-auto mb-0.5 h-px w-6 bg-border first:hidden"
              aria-hidden
            />
          ) : (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              {group.title}
            </p>
          )}
          {group.items.map(({ to, label, icon: Icon, exact }) => {
            const active = exact
              ? location.pathname === to
              : location.pathname === to ||
                location.pathname.startsWith(`${to}/`)
            const link = (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                className={cn(
                  'flex h-9 items-center rounded-[var(--radius-sm)] text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? label : undefined}
              >
                <Icon className="size-4.5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{label}</span>
                    {badgeFor(to)}
                  </>
                )}
              </Link>
            )
            if (!collapsed) return link
            return (
              <Tooltip key={to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-2">
                  {label}
                  {badgeFor(to)}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function NavBadge({
  tone,
  children,
}: {
  tone: 'danger' | 'accent'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
        tone === 'danger'
          ? 'bg-danger-soft text-danger'
          : 'bg-accent-soft text-accent',
      )}
    >
      {children}
    </span>
  )
}

function SidebarFooter({
  displayName,
  email,
  collapsed,
  onToggle,
}: {
  displayName: string
  email: string
  collapsed: boolean
  onToggle: () => void
}) {
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose
  const collapseLabel = collapsed ? 'Déplier le menu' : 'Réduire le menu'
  const collapseBtn = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={collapseLabel}
      aria-pressed={collapsed}
    >
      <CollapseIcon className="size-4.5" />
    </Button>
  )

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 border-t border-border p-2.5">
        <AccountMenu displayName={displayName} email={email} compact />
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>{collapseBtn}</TooltipTrigger>
          <TooltipContent side="right">{collapseLabel}</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <AccountMenu displayName={displayName} email={email} />
        </div>
        <ThemeToggle />
        {collapseBtn}
      </div>
    </div>
  )
}

function Topbar({
  displayName,
  email,
  collapsed,
}: {
  displayName: string
  email: string
  collapsed: boolean
}) {
  const palette = useCommandPalette()
  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur transition-[left] duration-200 md:px-6',
        collapsed ? 'lg:left-[4.25rem]' : 'lg:left-64',
      )}
    >
      <MobileNav />

      {/* Champ de recherche qui ouvre la palette de commandes. */}
      <button
        type="button"
        onClick={palette.open}
        className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-[var(--radius)] border border-border bg-bg px-3 text-sm text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"
        aria-label="Ouvrir la recherche et les commandes"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left">Rechercher…</span>
        <kbd className="hidden shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-fg-subtle sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      <NewOpportunityButton className="hidden sm:inline-flex" />

      <div className="lg:hidden">
        <AccountMenu displayName={displayName} email={email} />
      </div>
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
        <div className="px-3 pb-2">
          <NewOpportunityButton className="w-full justify-start" />
        </div>
        <SidebarNav className="px-3 pb-3" onNavigate={() => setOpen(false)} />
        <div className="mt-auto flex items-center justify-between border-t border-border p-3">
          <span className="text-xs text-fg-subtle">Apparence</span>
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function AccountMenu({
  displayName,
  email,
  compact = false,
}: {
  displayName: string
  email: string
  compact?: boolean
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
          aria-label={compact ? displayName : undefined}
          className={cn(
            'flex h-11 items-center rounded-[var(--radius)] text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]',
            compact
              ? 'size-9 justify-center p-0'
              : 'w-full gap-2.5 pl-1.5 pr-2.5',
          )}
        >
          <Avatar>
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="hidden min-w-0 flex-col sm:flex">
              <span className="truncate text-sm font-medium text-fg">
                {displayName}
              </span>
              {email && (
                <span className="truncate text-xs text-fg-subtle">{email}</span>
              )}
            </span>
          )}
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
      <aside className="hidden w-60 shrink-0 flex-col gap-2 border-r border-border bg-surface p-3 lg:flex">
        <Skeleton className="mb-2 h-10 w-32" />
        <Skeleton className="mb-3 h-11 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
          <Skeleton className="h-9 w-9 lg:hidden" />
          <Skeleton className="h-10 w-full max-w-md" />
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
