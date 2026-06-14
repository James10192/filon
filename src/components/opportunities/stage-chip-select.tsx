import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Check, ChevronDown } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
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
import { STAGES, STAGE_META, type Stage } from './meta'

/**
 * Chip d'etape cliquable : ouvre un menu pour changer l'etape via
 * `api.opportunities.setStage`. Mutation optimiste (l'UI suit aussitot)
 * + toast succes / erreur (rollback du local sur echec).
 *
 * Concu pour la cellule « Etape » du tableau dense : compact, clavier-first.
 */
export function StageChipSelect({
  id,
  stage,
  compact = false,
  className,
}: {
  id: Id<'opportunities'>
  stage: Stage
  compact?: boolean
  className?: string
}) {
  const setStage = useMutation(api.opportunities.setStage)
  // Etat local optimiste : reflete immediatement le choix, rollback si echec.
  const [optimistic, setOptimistic] = useState<Stage | null>(null)
  const [open, setOpen] = useState(false)

  const current = optimistic ?? stage
  const meta = STAGE_META[current]

  async function handleSelect(next: Stage) {
    if (next === current) return
    const previous = current
    setOptimistic(next)
    try {
      await setStage({ id, stage: next })
      toast.success(`Étape changée en « ${STAGE_META[next].label} ».`)
    } catch {
      setOptimistic(previous === stage ? null : previous)
      toast.error("Le changement d'étape a échoué.")
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
          aria-label={`Etape : ${meta.label}. Changer.`}
        >
          <span className={cn('size-1.5 shrink-0 rounded-full', meta.dot)} />
          <span className="truncate">{compact ? meta.short : meta.label}</span>
          <ChevronDown className="size-3 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[13rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel>Changer l'etape</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STAGES.map((s) => {
          const sMeta = STAGE_META[s]
          const active = s === current
          return (
            <DropdownMenuItem
              key={s}
              onSelect={() => handleSelect(s)}
              className="justify-between"
            >
              <span className="inline-flex items-center gap-2">
                <span className={cn('size-2 rounded-full', sMeta.dot)} />
                {sMeta.label}
              </span>
              {active && <Check className="size-4 text-accent" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
