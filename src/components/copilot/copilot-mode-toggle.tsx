import { Gauge, Sparkles } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import type { CopilotMode } from './use-copilot'

/**
 * Bascule Rapide / Qualité. Le mode `quality` route vers un modèle plus capable
 * (et consomme davantage de crédits) ; `fast` privilégie la latence.
 */
export function CopilotModeToggle({
  mode,
  onChange,
}: {
  mode: CopilotMode
  onChange: (mode: CopilotMode) => void
}) {
  return (
    <div
      role="group"
      aria-label={m.copilot_mode_label()}
      className="inline-flex items-center rounded-[var(--radius-sm)] border border-border bg-bg p-0.5"
    >
      <Option
        active={mode === 'fast'}
        onClick={() => onChange('fast')}
        icon={<Gauge className="size-3.5" />}
        label={m.copilot_mode_fast()}
      />
      <Option
        active={mode === 'quality'}
        onClick={() => onChange('quality')}
        icon={<Sparkles className="size-3.5" />}
        label={m.copilot_mode_quality()}
      />
    </div>
  )
}

function Option({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-accent text-accent-fg'
          : 'text-fg-muted hover:text-fg',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
