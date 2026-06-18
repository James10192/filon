import { Building2, User, Users, type LucideIcon } from 'lucide-react'
import { cn } from '~/lib/utils'
import { m } from '~/lib/paraglide/messages'

export type CarnetSegment = 'all' | 'companies' | 'people'

const SEGMENTS: { value: CarnetSegment; label: () => string; icon: LucideIcon }[] =
  [
    { value: 'all', label: m.carnet_segment_all, icon: Users },
    { value: 'companies', label: m.carnet_segment_companies, icon: Building2 },
    { value: 'people', label: m.carnet_segment_people, icon: User },
  ]

/**
 * Controle segmente du carnet : bascule entre Tout, Entreprises et
 * Particuliers. Sobre, aligne sur le `ViewSwitcher` des opportunites. Affiche
 * le compteur de chaque segment.
 */
export function CarnetSegments({
  value,
  onChange,
  counts,
}: {
  value: CarnetSegment
  onChange: (segment: CarnetSegment) => void
  counts: Record<CarnetSegment, number>
}) {
  return (
    <div
      role="tablist"
      aria-label={m.carnet_filter_aria()}
      className="inline-flex h-9 items-center gap-0.5 self-start rounded-[var(--radius)] border border-border bg-surface-2 p-0.5"
    >
      {SEGMENTS.map((segment) => {
        const Icon = segment.icon
        const active = segment.value === value
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(segment.value)}
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
            <span className="hidden sm:inline">{segment.label()}</span>
            <span
              className={cn(
                'rounded-full px-1.5 text-xs font-medium tabular-nums',
                active
                  ? 'bg-accent-soft text-accent'
                  : 'bg-surface text-fg-subtle',
              )}
            >
              {counts[segment.value]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
