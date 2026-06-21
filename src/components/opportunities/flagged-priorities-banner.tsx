import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Check, Loader2, Star } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'

/**
 * Bandeau « Priorités pointées par votre head sell », en tête de la page
 * Opportunités. Résout le vrai problème (« les commerciaux se perdent dans les
 * priorités ») : les opportunités pointées remontent ici, avec la note et qui a
 * pointé. Le propriétaire peut « Marquer comme traitée » (retire le pointage).
 * Masqué s'il n'y a aucune priorité pointée.
 */
export function FlaggedPrioritiesBanner({
  onSelect,
}: {
  onSelect: (id: Id<'opportunities'>) => void
}) {
  const flagged = useQuery(api.opportunities.myFlagged)
  const unflag = useMutation(api.opportunities.unflagPriority)
  const [busy, setBusy] = useState<Id<'opportunities'> | null>(null)

  if (!flagged || flagged.length === 0) return null

  async function onDone(id: Id<'opportunities'>) {
    setBusy(id)
    try {
      await unflag({ id })
      toast.success(m.unflag_toast())
    } catch {
      toast.error(m.unflag_error())
    } finally {
      setBusy(null)
    }
  }

  const count = flagged.length

  return (
    <div className="mb-5 rounded-[var(--radius-lg)] border border-accent/30 bg-accent-soft/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Star className="size-4 shrink-0 fill-accent text-accent" />
        <h3 className="text-sm font-semibold text-fg">
          {m.flag_banner_title()}
        </h3>
        <span className="ml-1 text-xs text-fg-muted">
          {count > 1
            ? m.flag_banner_count_plural({ count })
            : m.flag_banner_count_singular({ count })}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {flagged.map((o) => (
          <li
            key={o._id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(o._id)}
                className="block max-w-full truncate text-left text-sm font-medium text-fg hover:text-accent"
              >
                {o.title}
              </button>
              {o.flaggedNote && (
                <p className="truncate text-xs text-fg-muted">{o.flaggedNote}</p>
              )}
              {o.flaggedByName && (
                <p className="text-[11px] text-fg-subtle">
                  {m.flag_badge_by({ name: o.flaggedByName })}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onSelect(o._id)}>
                {m.flag_banner_view()}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy === o._id}
                onClick={() => onDone(o._id)}
              >
                {busy === o._id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                <span className="hidden sm:inline">{m.flag_banner_done()}</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
