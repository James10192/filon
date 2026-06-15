import { Link, useLocation } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import {
  KanbanSquare,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { authClient } from '~/lib/auth/auth-client'
import { useUpsell } from '~/lib/billing/use-upsell'
import { cn } from '~/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '~/components/ui/sidebar'
import { ThemeToggle } from './theme'
import { useQuickCapture } from './quick-capture'
import { NAV_GROUPS, isNavItemActive } from './nav-config'

/**
 * Sidebar de l'espace de travail, batie sur le composant officiel shadcn
 * (SidebarProvider/Sidebar/SidebarMenu...). Repli en mode "icon" persiste via
 * cookie par le provider. La signature visuelle : item actif marque par une
 * fine veine indigo 1px (a gauche) + teinte douce, jamais un bloc plein.
 */

/** Classes d'etat actif : veine indigo 1px a gauche + fond doux. */
const ACTIVE_NAV =
  'relative bg-sidebar-accent text-sidebar-accent-foreground ' +
  "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-px before:rounded-full before:bg-sidebar-primary before:content-[''] " +
  'group-data-[collapsible=icon]:before:hidden'

export function AppSidebar({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="p-2">
        <Brand />
        <div className="px-0.5">
          <NewOpportunityButton />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNav />
      </SidebarContent>

      <SidebarFooter>
        <FooterControls displayName={displayName} email={email} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function Brand() {
  return (
    <Link
      to="/app"
      className="flex h-9 items-center gap-2.5 px-1.5 text-sidebar-foreground"
      aria-label={m.sidebar_brand_aria()}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
        <KanbanSquare className="size-4" />
      </span>
      <span className="text-base font-semibold tracking-[-0.02em] group-data-[collapsible=icon]:hidden">
        Filon
      </span>
    </Link>
  )
}

/** Bouton « Nouvelle opportunité » (ouvre la capture rapide). */
function NewOpportunityButton() {
  const quickCapture = useQuickCapture()
  return (
    <SidebarMenuButton
      onClick={quickCapture.open}
      tooltip={m.sidebar_new_opportunity()}
      className="mt-1 bg-accent font-medium text-accent-fg hover:bg-accent-hover hover:text-accent-fg active:bg-accent-hover active:text-accent-fg"
    >
      <Plus className="size-4" />
      <span className="group-data-[collapsible=icon]:hidden">
        {m.sidebar_new_opportunity()}
      </span>
    </SidebarMenuButton>
  )
}

function SidebarNav() {
  const location = useLocation()
  // Badges live : relances en retard (danger) sinon a venir (accent).
  const summary = useQuery(api.dashboard.summary, {})

  function badge(to: string): { count: number; tone: 'danger' | 'accent' } | null {
    if (to !== '/app/relances' || !summary) return null
    const overdue = summary.followupsOverdue ?? 0
    const upcoming = summary.followupsUpcoming ?? 0
    if (overdue > 0) return { count: overdue, tone: 'danger' }
    if (upcoming > 0) return { count: upcoming, tone: 'accent' }
    return null
  }

  return (
    <>
      {NAV_GROUPS.map((group) => (
        <SidebarGroup key={group.title()}>
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.08em] text-sidebar-foreground/55 uppercase">
            {group.title()}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = isNavItemActive(location.pathname, item)
                const Icon: LucideIcon = item.icon
                const b = badge(item.to)
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label()}
                      className={cn(active && ACTIVE_NAV)}
                    >
                      <Link
                        to={item.to}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon className="size-4" />
                        <span>{item.label()}</span>
                      </Link>
                    </SidebarMenuButton>
                    {b && (
                      <SidebarMenuBadge
                        className={cn(
                          'assay',
                          b.tone === 'danger'
                            ? 'text-danger'
                            : 'text-accent',
                        )}
                      >
                        {b.count}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}

function FooterControls({
  displayName,
  email,
}: {
  displayName: string
  email: string
}) {
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        collapsed && 'flex-col gap-1.5',
      )}
    >
      <div className="min-w-0 flex-1">
        <AccountMenu
          displayName={displayName}
          email={email}
          compact={collapsed}
        />
      </div>
      <div className={cn(collapsed && 'flex flex-col items-center')}>
        <ThemeToggle />
      </div>
    </div>
  )
}

function AccountMenu({
  displayName,
  email,
  compact,
}: {
  displayName: string
  email: string
  compact: boolean
}) {
  // Présence discrète (jamais nag) : « Améliorer » seulement pour non-payeurs max.
  const { plan } = useUpsell()
  const showUpgrade = plan !== 'pro_ai'

  // Photo de profil : `users.image` est la source unique de l'avatar (sociale
  // ou importée). Si absente, on retombe sur les initiales.
  const me = useQuery(api.users.me, {})
  const image = me?.image ?? undefined

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
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={compact ? displayName : undefined}
          className={cn(
            'flex h-11 items-center rounded-[var(--radius)] text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            compact
              ? 'size-9 justify-center p-0'
              : 'w-full gap-2.5 pr-2.5 pl-1.5',
          )}
        >
          <Avatar>
            {image && <AvatarImage src={image} alt={displayName} />}
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {displayName}
              </span>
              {email && (
                <span className="assay-meta truncate text-xs">{email}</span>
              )}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/parametres">
            <Settings className="size-4" />
            {m.sidebar_settings()}
          </Link>
        </DropdownMenuItem>
        {showUpgrade && (
          <DropdownMenuItem asChild>
            <Link to="/app/tarifs">
              <Sparkles className="size-4" />
              {m.sidebar_upgrade()}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut className="size-4" />
          {m.sidebar_logout()}
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
