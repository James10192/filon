import { List, KanbanSquare, type LucideIcon } from 'lucide-react'
import { cn } from '~/lib/utils'

export type ProposalView = 'liste' | 'tableau'

export const PROPOSAL_VIEWS: ProposalView[] = ['liste', 'tableau']

const VIEW_META: Record<ProposalView, { label: string; icon: LucideIcon }> = {
  liste: { label: 'Liste', icon: List },
  tableau: { label: 'Tableau', icon: KanbanSquare },
}

/**
 * Sélecteur de vue de l'espace Propositions. Contrôle segmenté sobre : fond
 * surface-2, segment actif en surface avec une fine veine d'accent dessous.
 */
export function ViewSwitcher({
  value,
  onChange,
}: {
  value: ProposalView
  onChange: (view: ProposalView) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Choisir la vue"
      className="inline-flex h-9 items-center gap-0.5 rounded-[var(--radius)] border border-border bg-surface-2 p-0.5"
    >
      {PROPOSAL_VIEWS.map((view) => {
        const meta = VIEW_META[view]
        const Icon = meta.icon
        const active = view === value
        return (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(view)}
            className={cn(
              'relative inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]',
              active
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon
              className={cn('size-4', active ? 'text-accent' : 'text-fg-subtle')}
            />
            <span className="hidden sm:inline">{meta.label}</span>
          </button>
        )
      })}
    </div>
  )
}
