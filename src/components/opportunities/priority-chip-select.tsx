import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Check, ChevronDown } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { toast } from '~/components/ui/sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { PRIORITY_META, type Priority } from './meta'

const PRIORITIES: Priority[] = ['high', 'medium', 'low']

/**
 * Chip de priorite cliquable : ouvre un menu pour changer la priorite via
 * `api.opportunities.setPriority`. Mutation optimiste (l'UI suit aussitot) +
 * toast succes / erreur (rollback du local sur echec). Pendant du
 * `StageChipSelect`, pense pour la cellule « Priorite » du tableau dense.
 */
export function PriorityChipSelect({
  id,
  priority,
  className,
}: {
  id: Id<'opportunities'>
  priority: Priority
  className?: string
}) {
  const setPriority = useMutation(api.opportunities.setPriority)
  const [optimistic, setOptimistic] = useState<Priority | null>(null)
  const [open, setOpen] = useState(false)

  const current = optimistic ?? priority
  const meta = PRIORITY_META[current]

  async function handleSelect(next: Priority) {
    if (next === current) return
    const previous = current
    setOptimistic(next)
    try {
      await setPriority({ id, priority: next })
      toast.success(
        m.opp_priority_changed({ priority: PRIORITY_META[next].label }),
      )
    } catch {
      setOptimistic(previous === priority ? null : previous)
      toast.error(m.opp_priority_change_error())
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          // Empeche le clic ligne (navigation detail) de se declencher.
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full pl-2.5 pr-1.5 text-xs font-medium outline-none transition-[box-shadow,opacity] hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]',
            meta.chip,
            className,
          )}
          aria-label={m.opp_priority_select_aria({ priority: meta.label })}
        >
          <span className="truncate">{meta.label}</span>
          <ChevronDown className="size-3 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[11rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel>{m.opp_priority_change_label()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PRIORITIES.map((p) => {
          const pMeta = PRIORITY_META[p]
          const active = p === current
          return (
            <DropdownMenuItem
              key={p}
              onSelect={() => handleSelect(p)}
              className="justify-between"
            >
              <span
                className={cn(
                  'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium',
                  pMeta.chip,
                )}
              >
                {pMeta.label}
              </span>
              {active && <Check className="size-4 text-accent" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
