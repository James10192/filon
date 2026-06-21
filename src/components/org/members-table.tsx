import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Skeleton } from '~/components/ui/skeleton'
import { AskCopilotButton } from '~/components/copilot/ask-copilot-button'
import { MemberRoleSelect } from './member-role-select'
import { MemberInviteDialog } from './member-invite-dialog'
import type { OrgRole } from './roles'

function initials(name: string | null, email: string): string {
  const base = (name ?? email).trim()
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

/**
 * Tableau des membres d'une organisation. `canManage` (admin) débloque le
 * sélecteur de rôle, le retrait et le bouton d'invitation ; sinon lecture seule.
 * Le propriétaire n'est jamais modifiable (badge dédié).
 */
export function MembersTable({
  organizationId,
  canManage,
}: {
  organizationId: Id<'organizations'>
  canManage: boolean
}) {
  const members = useQuery(api.members.list, { organizationId })

  if (members === undefined) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {members.length}{' '}
          {members.length > 1 ? m.org_tab_members() : m.member_col_member()}
        </p>
        {canManage && (
          <div className="flex items-center gap-2">
            <AskCopilotButton
              seed={m.copilot_seed_team()}
              label={m.copilot_seed_team_cta()}
              size="sm"
              buttonVariant="outline"
            />
            <MemberInviteDialog organizationId={organizationId} />
          </div>
        )}
      </div>

      {members.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-fg-muted">
          {m.members_empty()}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">{m.member_col_member()}</TableHead>
                <TableHead className="px-3">{m.member_col_role()}</TableHead>
                <TableHead className="px-3">{m.member_col_status()}</TableHead>
                {canManage && (
                  <TableHead className="w-12 px-3">
                    <span className="sr-only">{m.member_col_actions()}</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((mem) => (
                <TableRow key={mem.membershipId} className="hover:bg-surface-2">
                  <TableCell className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        {mem.image && <AvatarImage src={mem.image} alt="" />}
                        <AvatarFallback className="text-[11px]">
                          {initials(mem.name, mem.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-fg">
                          {mem.name ?? mem.email}
                          {mem.isOwner && (
                            <span className="inline-flex h-4 items-center rounded-full bg-accent-soft px-1.5 text-[10px] font-medium text-accent">
                              {m.member_owner_badge()}
                            </span>
                          )}
                        </span>
                        {mem.name && (
                          <span className="truncate text-xs text-fg-subtle">
                            {mem.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <MemberRoleSelect
                      membershipId={mem.membershipId}
                      role={mem.role as OrgRole}
                      manageable={canManage && !mem.isOwner}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium',
                        mem.status === 'active'
                          ? 'bg-success-soft text-success'
                          : 'bg-warning-soft text-warning',
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {mem.status === 'active'
                        ? m.member_status_active()
                        : m.member_status_pending()}
                    </span>
                  </TableCell>
                  {canManage && (
                    <TableCell className="w-12 px-3 py-2.5">
                      {!mem.isOwner && (
                        <RemoveMemberButton membershipId={mem.membershipId} />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function RemoveMemberButton({
  membershipId,
}: {
  membershipId: Id<'memberships'>
}) {
  const remove = useMutation(api.members.remove)
  const [pending, setPending] = useState(false)

  async function onConfirm() {
    setPending(true)
    try {
      await remove({ membershipId })
      toast.success(m.member_removed_toast())
    } catch (err) {
      toast.error(errorMessage(err, m.member_remove_error()))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-fg-subtle hover:text-danger"
          aria-label={m.member_remove()}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.member_remove_confirm_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.member_remove_confirm_desc()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.member_remove_confirm_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending}
            className="bg-danger text-white hover:bg-danger/90"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {m.member_remove_confirm_action()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
