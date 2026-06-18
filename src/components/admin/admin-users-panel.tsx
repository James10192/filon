import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { Search, Users, AlertTriangle } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Plan } from '~/lib/billing/plan'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '~/components/ui/sheet'
import { AdminAccountDetail } from './admin-account-detail'
import { useMediaQuery } from '~/hooks/use-media-query'
import {
  formatDate,
  formatNumber,
  formatRelative,
  initials,
  planBadgeVariant,
  planLabel,
} from './admin-meta'

type AdminUser = {
  _id: string
  email: string
  name?: string
  image?: string
  plan: Plan
  createdAt: number
  opportunitiesCount: number
  veillesCount: number
  lastActivityAt: number
}

/**
 * Section « Utilisateurs » du back-office : table cross-tenant des comptes,
 * tri récents d'abord (côté serveur), recherche client sur nom/email.
 */
export function AdminUsersPanel({
  selectedUserId,
  onSelect,
}: {
  selectedUserId: string | null
  onSelect: (userId: string | null) => void
}) {
  const users = useQuery(api.admin.listUsers, {}) as AdminUser[] | undefined
  const [search, setSearch] = useState('')
  // Le split desktop apparaît à `lg` ; en dessous on bascule sur le Sheet.
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const filtered = useMemo(() => {
    if (!users) return undefined
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name?.toLowerCase().includes(q) ?? false),
    )
  }, [users, search])

  const compact = selectedUserId !== null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {users
            ? `${formatNumber(users.length)} compte${users.length > 1 ? 's' : ''}, récents d'abord.`
            : 'Chargement des comptes.'}
        </p>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou e-mail"
            className="h-11 pl-9"
            aria-label="Rechercher un utilisateur"
          />
        </div>
      </div>

      <div className="flex gap-5">
        <div
          className={
            compact
              ? 'w-full shrink-0 lg:w-80'
              : 'w-full'
          }
        >
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
            {filtered === undefined ? (
              <UsersTableSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyUsers hasSearch={search.trim().length > 0} />
            ) : (
              <>
                {/* Mobile : cartes empilées (tableau illisible sous sm).
                    Si le panneau détail est ouvert (compact), on garde la liste
                    réduite au seul utilisateur, qui tient déjà sur mobile. */}
                {!compact && (
                  <ul className="flex flex-col divide-y divide-border sm:hidden">
                    {filtered.map((u) => (
                      <UserMobileCard
                        key={u._id}
                        user={u}
                        selected={u._id === selectedUserId}
                        onSelect={onSelect}
                      />
                    ))}
                  </ul>
                )}
                <div className={compact ? '' : 'hidden sm:block'}>
                  <UsersTable
                    users={filtered}
                    compact={compact}
                    selectedUserId={selectedUserId}
                    onSelect={onSelect}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Panneau détail 360 — desktop : colonne sticky à droite */}
        {compact && selectedUserId && (
          <aside className="sticky top-0 hidden h-[calc(100dvh-9rem)] flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] lg:block">
            <AdminAccountDetail
              key={selectedUserId}
              userId={selectedUserId}
              onClose={() => onSelect(null)}
            />
          </aside>
        )}
      </div>

      {/* Panneau détail 360 — sous `lg` : Sheet plein écran (au-dessus, c'est le
          split à droite ; ne pas ouvrir le Sheet sinon son overlay assombrit le
          desktop alors que le panneau est déjà visible). */}
      <Sheet
        open={compact && !isDesktop}
        onOpenChange={(open) => !open && onSelect(null)}
      >
        <SheetContent
          side="right"
          className="w-full max-w-full gap-0 p-0 [&>button:last-child]:hidden"
        >
          <SheetTitle className="sr-only">Détail du compte</SheetTitle>
          <SheetDescription className="sr-only">
            Vue 360 du compte sélectionné.
          </SheetDescription>
          {selectedUserId && (
            <AdminAccountDetail
              key={selectedUserId}
              userId={selectedUserId}
              onClose={() => onSelect(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

function UsersTable({
  users,
  compact,
  selectedUserId,
  onSelect,
}: {
  users: AdminUser[]
  compact: boolean
  selectedUserId: string | null
  onSelect: (userId: string | null) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-fg-muted">Utilisateur</TableHead>
          {!compact && (
            <>
              <TableHead className="text-fg-muted">Palier</TableHead>
              <TableHead className="text-right text-fg-muted">Opp.</TableHead>
              <TableHead className="text-right text-fg-muted">Veilles</TableHead>
              <TableHead className="text-fg-muted">Inscription</TableHead>
              <TableHead className="text-fg-muted">Activité</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => {
          const name = u.name?.trim() || u.email
          const isSelected = u._id === selectedUserId
          return (
            <TableRow
              key={u._id}
              onClick={() => onSelect(isSelected ? null : u._id)}
              data-state={isSelected ? 'selected' : undefined}
              className="cursor-pointer border-border data-[state=selected]:bg-accent-soft"
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    {u.image && <AvatarImage src={u.image} alt={name} />}
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-fg">
                      {name}
                    </span>
                    {u.name && (
                      <span className="truncate text-xs text-fg-subtle">
                        {u.email}
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              {!compact && (
                <>
                  <TableCell>
                    <Badge variant={planBadgeVariant(u.plan)}>
                      {planLabel(u.plan)}
                    </Badge>
                  </TableCell>
                  <TableCell className="assay text-right text-fg">
                    {formatNumber(u.opportunitiesCount)}
                  </TableCell>
                  <TableCell className="assay text-right text-fg">
                    {formatNumber(u.veillesCount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-fg-muted">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-fg-muted">
                    {formatRelative(u.lastActivityAt)}
                  </TableCell>
                </>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

/** Carte d'un utilisateur pour l'affichage mobile (sous `sm`). */
function UserMobileCard({
  user,
  selected,
  onSelect,
}: {
  user: AdminUser
  selected: boolean
  onSelect: (userId: string | null) => void
}) {
  const name = user.name?.trim() || user.email
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(selected ? null : user._id)}
        data-state={selected ? 'selected' : undefined}
        className="flex w-full min-h-11 flex-col gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 data-[state=selected]:bg-accent-soft"
      >
        <div className="flex items-center gap-3">
          <Avatar className="size-9 shrink-0">
            {user.image && <AvatarImage src={user.image} alt={name} />}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-fg">{name}</span>
            {user.name && (
              <span className="truncate text-xs text-fg-subtle">
                {user.email}
              </span>
            )}
          </div>
          <Badge variant={planBadgeVariant(user.plan)} className="shrink-0">
            {planLabel(user.plan)}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
          <span>
            <span className="assay font-medium text-fg">
              {formatNumber(user.opportunitiesCount)}
            </span>{' '}
            opp.
          </span>
          <span>
            <span className="assay font-medium text-fg">
              {formatNumber(user.veillesCount)}
            </span>{' '}
            veilles
          </span>
          <span className="ml-auto">{formatRelative(user.lastActivityAt)}</span>
        </div>
      </button>
    </li>
  )
}

function EmptyUsers({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-subtle">
        <Users className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">
        {hasSearch ? 'Aucun résultat' : 'Aucun utilisateur'}
      </p>
      <p className="max-w-xs text-sm text-fg-muted">
        {hasSearch
          ? 'Aucun compte ne correspond à cette recherche.'
          : 'Les comptes inscrits apparaîtront ici.'}
      </p>
    </div>
  )
}

function UsersTableSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-16 rounded-[var(--radius-sm)]" />
          <Skeleton className="hidden h-3 w-24 sm:block" />
        </div>
      ))}
    </div>
  )
}

/** État d'erreur réutilisable (accès refusé ou échec réseau). */
export function AdminError({ error }: { error: unknown }) {
  const message =
    error instanceof ConvexError &&
    typeof error.data === 'object' &&
    error.data &&
    'message' in error.data
      ? String((error.data as { message: unknown }).message)
      : 'Une erreur est survenue lors du chargement.'
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-danger-soft text-danger">
        <AlertTriangle className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">Chargement impossible</p>
      <p className="max-w-xs text-sm text-fg-muted">{message}</p>
    </div>
  )
}
