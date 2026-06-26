import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2, LogOut } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { OrgCreateCard } from './org-create-card'
import { OrgInvitesCard } from './org-invites-card'
import { MembersTable } from './members-table'
import { MemberCarnetView } from './member-carnet-view'
import { CarnetSharingCard } from './carnet-sharing-card'
import { TeamBoard } from './team-board'
import { MetricsDashboard } from './metrics-dashboard'
import { OrgSettingsCard } from './org-settings-card'
import { ROLE_META, isManagerRole, roleLabel, type OrgRole } from './roles'

/** Membre sélectionné dont le manager consulte le carnet (lecture seule). */
type ViewingMember = {
  userId: string
  name: string
  image: string | null
}

/**
 * Hub d'équipe adaptatif. Sans organisation : invitations + création. Avec :
 * en-tête (sélecteur si plusieurs orgs + rôle), puis onglets filtrés par rôle
 * (Équipe/Métriques = managers, Membres = tous, Réglages = admin).
 */
export function OrgHub() {
  const mine = useQuery(api.organizations.mine)
  const [selectedId, setSelectedId] = useState<Id<'organizations'> | null>(null)
  const [viewingMember, setViewingMember] = useState<ViewingMember | null>(null)

  if (mine === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
      </div>
    )
  }

  if (mine.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2">
        <OrgInvitesCard />
        <OrgCreateCard />
        <p className="text-center text-sm text-fg-subtle">
          {m.org_empty_description()}
        </p>
      </div>
    )
  }

  const current = mine.find((o) => o.organizationId === selectedId) ?? mine[0]
  const role = current.role as OrgRole
  const manager = isManagerRole(role)
  const isAdmin = role === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <OrgInvitesCard />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {mine.length > 1 ? (
            <Select
              value={current.organizationId}
              onValueChange={(v) => {
                setSelectedId(v as Id<'organizations'>)
                setViewingMember(null)
              }}
            >
              <SelectTrigger
                className="w-[220px]"
                aria-label={m.org_switcher_label()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mine.map((o) => (
                  <SelectItem key={o.organizationId} value={o.organizationId}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <h2 className="text-lg font-semibold text-fg">{current.name}</h2>
          )}
          <span
            className={cn(
              'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium',
              ROLE_META[role].chip,
            )}
            title={m.org_your_role()}
          >
            {roleLabel(role)}
          </span>
        </div>
        {!isAdmin && <LeaveButton organizationId={current.organizationId} />}
      </div>

      <Tabs
        key={current.organizationId}
        defaultValue={manager ? 'team' : 'members'}
      >
        <TabsList>
          {manager && (
            <TabsTrigger value="team">{m.org_tab_team()}</TabsTrigger>
          )}
          <TabsTrigger value="members">{m.org_tab_members()}</TabsTrigger>
          {manager && (
            <TabsTrigger value="metrics">{m.org_tab_metrics()}</TabsTrigger>
          )}
          <TabsTrigger value="privacy">{m.org_carnet_tab()}</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings">{m.org_tab_settings()}</TabsTrigger>
          )}
        </TabsList>

        {manager && (
          <TabsContent value="team" className="mt-5">
            <TeamBoard organizationId={current.organizationId} />
          </TabsContent>
        )}
        <TabsContent value="members" className="mt-5">
          {viewingMember ? (
            <MemberCarnetView
              organizationId={current.organizationId}
              targetUserId={viewingMember.userId}
              memberName={viewingMember.name}
              memberImage={viewingMember.image}
              onBack={() => setViewingMember(null)}
            />
          ) : (
            <MembersTable
              organizationId={current.organizationId}
              canManage={isAdmin}
              canViewCarnet={manager}
              onViewCarnet={(userId, name, image) =>
                setViewingMember({ userId, name, image })
              }
            />
          )}
        </TabsContent>
        {manager && (
          <TabsContent value="metrics" className="mt-5">
            <MetricsDashboard organizationId={current.organizationId} />
          </TabsContent>
        )}
        <TabsContent value="privacy" className="mt-5">
          <CarnetSharingCard organizationId={current.organizationId} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="settings" className="mt-5">
            <OrgSettingsCard
              organizationId={current.organizationId}
              name={current.name}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function LeaveButton({
  organizationId,
}: {
  organizationId: Id<'organizations'>
}) {
  const leave = useMutation(api.organizations.leave)
  const [pending, setPending] = useState(false)

  async function onLeave() {
    setPending(true)
    try {
      await leave({ organizationId })
      toast.success(m.org_left_toast())
    } catch (err) {
      toast.error(errorMessage(err, m.org_leave_error()))
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onLeave} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      <span className="hidden sm:inline">{m.org_leave_button()}</span>
    </Button>
  )
}
