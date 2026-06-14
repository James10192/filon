import { useEffect, useState } from 'react'
import {
  Outlet,
  createFileRoute,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router'
import { ConvexProvider } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { Loader2 } from 'lucide-react'
import { authClient, useSession } from '~/lib/auth/auth-client'
import { Skeleton } from '~/components/ui/skeleton'
import {
  SidebarInset,
  SidebarProvider,
} from '~/components/ui/sidebar'
import { ThemeProvider } from '~/components/app/theme'
import {
  QuickCaptureProvider,
  useQuickCapture,
} from '~/components/app/quick-capture'
import {
  CommandPaletteProvider,
  useCommandPalette,
} from '~/components/app/command-palette'
import { AppSidebar } from '~/components/app/app-sidebar'
import { Topbar } from '~/components/app/topbar'
import { MobileBottombar } from '~/components/app/mobile-bottombar'

export const Route = createFileRoute('/app')({
  component: AppLayout,
  head: () => ({ meta: [{ title: 'Filon · Espace de travail' }] }),
})

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
// Coquille visuelle. Les providers Theme / Quick Capture / Command Palette sont
// montes ICI, dans la zone authentifiee (apres AuthGate + ConvexProviders),
// jamais dans __root.tsx.
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

const SIDEBAR_COOKIE_NAME = 'sidebar_state'

/**
 * Etat replie/etendu par defaut, lu depuis le cookie ecrit par le provider
 * shadcn. On rend etendu au SSR + premier paint (pas de mismatch), puis on
 * remonte le provider avec la valeur stockee une fois cote client.
 */
function useSidebarDefaultOpen(): { defaultOpen: boolean; ready: boolean } {
  const [state, setState] = useState({ defaultOpen: true, ready: false })
  useEffect(() => {
    let open = true
    try {
      const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
      if (match) open = match.split('=')[1] !== 'false'
    } catch {
      /* cookie indisponible : on garde le defaut etendu */
    }
    setState({ defaultOpen: open, ready: true })
  }, [])
  return state
}

function ShellLayout({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  useGlobalShortcuts()
  const { defaultOpen, ready } = useSidebarDefaultOpen()

  return (
    // La cle force un remontage propre quand l'etat persiste est resolu cote
    // client, pour appliquer le repli sans mismatch d'hydratation.
    <SidebarProvider key={ready ? 'ready' : 'ssr'} defaultOpen={defaultOpen}>
      <AppSidebar displayName={displayName} email={email} />
      {/* La coquille est fixe ; seul le contenu defile (SidebarInset). */}
      <SidebarInset className="h-svh overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 pb-24 md:px-6 lg:px-8 lg:pb-5">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <MobileBottombar />
    </SidebarProvider>
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

function ShellSkeleton() {
  return (
    <div className="flex min-h-[100dvh] bg-bg">
      <aside className="hidden w-64 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-2 lg:flex">
        <Skeleton className="mb-1 h-9 w-28" />
        <Skeleton className="mb-3 h-9 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
          <Skeleton className="size-9" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-44 sm:w-64" />
            <Skeleton className="h-11 w-44" />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-accent" />
        </main>
      </div>
    </div>
  )
}
