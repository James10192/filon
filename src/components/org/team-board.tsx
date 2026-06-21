import { useQuery } from 'convex/react'
import { Star } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Skeleton } from '~/components/ui/skeleton'
import { StageChip, PriorityChip, TargetChip } from '~/components/opportunities/chips'
import { FlagPriorityAction } from './flag-priority-dialog'

function initials(name: string | null, fallback: string): string {
  const base = (name ?? fallback).trim()
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

/**
 * Tableau transversal de l'équipe (manager). Toutes les opportunités des membres
 * actifs, pointées en tête. Action « pointer une priorité » par ligne. Les lignes
 * ne sont pas cliquables : le détail d'une opportunité reste privé à son
 * propriétaire (la query `get` est scopée `userId`).
 */
export function TeamBoard({
  organizationId,
}: {
  organizationId: Id<'organizations'>
}) {
  const data = useQuery(api.team.pipeline, { organizationId })

  if (data === undefined) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-fg">{m.team_title()}</h3>
        <p className="mt-1 text-sm text-fg-muted">{m.team_description()}</p>
      </div>

      {data.opportunities.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-fg-muted">
          {m.team_empty()}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">{m.team_col_opportunity()}</TableHead>
                <TableHead className="px-3">{m.team_col_owner()}</TableHead>
                <TableHead className="px-3">{m.team_col_stage()}</TableHead>
                <TableHead className="hidden px-3 md:table-cell">
                  {m.team_col_priority()}
                </TableHead>
                <TableHead className="px-3 text-right">
                  <span className="sr-only">{m.team_col_actions()}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.opportunities.map((o) => {
                const targetName = o.companyName ?? o.contactName
                return (
                  <TableRow
                    key={o._id}
                    className={cn(
                      'hover:bg-surface-2',
                      o.flaggedPriority &&
                        'bg-accent-soft/30 shadow-[inset_2px_0_0_0_var(--color-accent)]',
                    )}
                  >
                    <TableCell className="px-3 py-2.5">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="flex items-center gap-1.5">
                          {o.flaggedPriority && (
                            <Star className="size-3.5 shrink-0 fill-accent text-accent" />
                          )}
                          <span className="truncate font-medium text-fg">
                            {o.title}
                          </span>
                        </span>
                        {targetName && (
                          <TargetChip
                            targetType={o.effectiveTargetType}
                            name={targetName}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          {o.ownerImage && (
                            <AvatarImage src={o.ownerImage} alt="" />
                          )}
                          <AvatarFallback className="text-[10px]">
                            {initials(o.ownerName, o.ownerUserId)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm text-fg-muted">
                          {o.ownerName ?? '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      <StageChip stage={o.stage} compact />
                    </TableCell>
                    <TableCell className="hidden px-3 py-2.5 md:table-cell">
                      <PriorityChip priority={o.priority} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right">
                      <FlagPriorityAction
                        opportunityId={o._id}
                        ownerName={o.ownerName ?? o.title}
                        flagged={!!o.flaggedPriority}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
