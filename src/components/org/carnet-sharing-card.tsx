import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Eye, ShieldCheck } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { errorMessage } from '~/lib/billing/plan'
import { formatDate } from '~/components/relances/format'
import { toast } from '~/components/ui/sonner'
import { Switch } from '~/components/ui/switch'
import { Skeleton } from '~/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/**
 * Carte de confidentialité du carnet, visible par TOUS les membres. Le membre
 * courant active/désactive le partage de son carnet (contacts, entreprises,
 * relances) avec les managers de l'organisation (défaut ON, dérivé serveur).
 * Rappelle que le pipeline reste visible indépendamment, et liste qui a consulté
 * le carnet (90 jours). Aucune logique de décision client : la valeur courante
 * vient de `members.list` (`sharesCarnet`), l'autorité reste au serveur.
 */
export function CarnetSharingCard({
  organizationId,
}: {
  organizationId: Id<'organizations'>
}) {
  const me = useQuery(api.users.me)
  const members = useQuery(api.members.list, { organizationId })
  const log = useQuery(api.carnet.myCarnetAccessLog)
  const setSharing = useMutation(api.members.setMyCarnetSharing)
  const [pending, setPending] = useState(false)

  const loading =
    me === undefined || members === undefined || log === undefined

  // Ligne du membre courant dans l'org (match par authId).
  const selfRow =
    me && members
      ? members.find((row) => row.userId === me.authId) ?? null
      : null
  const enabled = selfRow?.sharesCarnet ?? true

  async function onToggle(next: boolean) {
    setPending(true)
    try {
      await setSharing({ organizationId, enabled: next })
      toast.success(m.org_carnet_sharing_updated())
    } catch (err) {
      toast.error(errorMessage(err, m.org_carnet_sharing_error()))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-accent" />
          {m.org_carnet_sharing_title()}
        </CardTitle>
        <CardDescription>{m.org_carnet_sharing_description()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3.5">
          <label
            htmlFor="carnet-sharing-toggle"
            className="text-sm font-medium text-fg"
          >
            {m.org_carnet_sharing_consent()}
          </label>
          {loading ? (
            <Skeleton className="h-[1.15rem] w-8 shrink-0 rounded-full" />
          ) : (
            <Switch
              id="carnet-sharing-toggle"
              checked={enabled}
              disabled={pending || !selfRow}
              onCheckedChange={onToggle}
              className="mt-0.5 shrink-0"
              aria-label={m.org_carnet_sharing_consent()}
            />
          )}
        </div>

        <p className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          {m.org_carnet_sharing_pipeline_notice()}
        </p>

        <div className="flex flex-col gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Eye className="size-4 text-fg-subtle" />
            {m.org_carnet_sharing_log_title()}
          </h4>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-[var(--radius-lg)]" />
              ))}
            </div>
          ) : log.length === 0 ? (
            <p className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-fg-muted">
              {m.org_carnet_sharing_log_empty()}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {log.map((entry, i) => (
                <li
                  key={`${entry.dayKey}-${i}`}
                  className="flex min-h-11 items-center gap-2.5 rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2"
                >
                  <Avatar className="size-7">
                    {entry.viewerImage && (
                      <AvatarImage src={entry.viewerImage} alt="" />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {initials(entry.viewerName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">
                    {m.org_carnet_sharing_log_entry({
                      viewer: entry.viewerName,
                      date: formatDate(entry.dayKey),
                    })}
                  </span>
                  {entry.viewCount > 1 && (
                    <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                      {m.org_carnet_sharing_view_count({
                        count: entry.viewCount,
                      })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
