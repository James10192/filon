import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Check, Loader2, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { ROLE_META, roleLabel, type OrgRole } from './roles'

/**
 * Carte des invitations en attente pour le user courant (par e-mail). Masquée
 * s'il n'y en a aucune. Accepter/refuser via `api.members.acceptInvite` /
 * `declineInvite` (le serveur revérifie la limite de membres à l'acceptation).
 */
export function OrgInvitesCard() {
  const invites = useQuery(api.members.myInvites)
  const accept = useMutation(api.members.acceptInvite)
  const decline = useMutation(api.members.declineInvite)
  const [busy, setBusy] = useState<Id<'memberships'> | null>(null)

  if (!invites || invites.length === 0) return null

  async function onAccept(membershipId: Id<'memberships'>) {
    setBusy(membershipId)
    try {
      await accept({ membershipId })
      toast.success(m.org_invite_accepted_toast())
    } catch (err) {
      toast.error(errorMessage(err, m.org_invite_action_error()))
    } finally {
      setBusy(null)
    }
  }

  async function onDecline(membershipId: Id<'memberships'>) {
    setBusy(membershipId)
    try {
      await decline({ membershipId })
      toast.success(m.org_invite_declined_toast())
    } catch (err) {
      toast.error(errorMessage(err, m.org_invite_action_error()))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.org_invites_title()}</CardTitle>
        <CardDescription>{m.org_invites_description()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {invites.map((inv) => (
          <div
            key={inv.membershipId}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2.5"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium text-fg">
                {m.org_invite_from({ org: inv.orgName })}
              </span>
              <span
                className={cn(
                  'inline-flex h-5 w-fit items-center rounded-full px-2 text-[11px] font-medium',
                  ROLE_META[inv.role as OrgRole].chip,
                )}
              >
                {roleLabel(inv.role as OrgRole)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy === inv.membershipId}
                onClick={() => onDecline(inv.membershipId)}
              >
                <X className="size-4" />
                <span className="hidden sm:inline">{m.org_invite_decline()}</span>
              </Button>
              <Button
                size="sm"
                disabled={busy === inv.membershipId}
                onClick={() => onAccept(inv.membershipId)}
              >
                {busy === inv.membershipId ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                <span className="hidden sm:inline">{m.org_invite_accept()}</span>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
