import { cn } from '~/lib/utils'
import { Badge } from '~/components/ui/badge'
import type { Interval } from '~/lib/billing/plan'

/**
 * Sélecteur mensuel / annuel. L'annuel met en avant « 2 mois offerts ».
 * Segmenté, accessible (role group + aria-pressed), sobre (monochrome + accent).
 */
export function IntervalToggle({
  value,
  onChange,
}: {
  value: Interval
  onChange: (interval: Interval) => void
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div
        role="group"
        aria-label="Période de facturation"
        className="inline-flex items-center rounded-[var(--radius)] border border-border bg-surface-2 p-1"
      >
        <ToggleButton
          active={value === 'monthly'}
          onClick={() => onChange('monthly')}
        >
          Mensuel
        </ToggleButton>
        <ToggleButton
          active={value === 'annual'}
          onClick={() => onChange('annual')}
        >
          Annuel
        </ToggleButton>
      </div>
      <Badge variant="accent">2 mois offerts</Badge>
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 rounded-[var(--radius-sm)] px-4 text-sm font-medium transition-colors',
        active
          ? 'bg-surface text-fg shadow-[var(--shadow-card)]'
          : 'text-fg-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
