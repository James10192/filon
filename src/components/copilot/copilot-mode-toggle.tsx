import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { Gauge, Lock, Sparkles } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { allowsQualityModel } from '~/lib/billing/plan'
import { cn } from '~/lib/utils'
import type { CopilotMode } from './use-copilot'

/**
 * Bascule Rapide / Qualité. Le mode `quality` route vers un modèle plus capable
 * (et consomme davantage de crédits) ; `fast` privilégie la latence.
 *
 * Le mode « Qualité » est réservé aux paliers Copilot : verrouillé (cadenas +
 * renvoi tarifs) pour les paliers inférieurs. Le serveur reste l'autorité (il
 * rabat « Qualité » sur « Rapide » si le palier n'y a pas droit) ; ce verrou
 * n'est que cosmétique.
 */
export function CopilotModeToggle({
  mode,
  onChange,
}: {
  mode: CopilotMode
  onChange: (mode: CopilotMode) => void
}) {
  const myPlan = useQuery(api.billing.myPlan, {})
  const canQuality = allowsQualityModel(myPlan?.plan ?? 'free')

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
      {canQuality ? (
        <Option
          active={mode === 'quality'}
          onClick={() => onChange('quality')}
          icon={<Sparkles className="size-3.5" />}
          label={m.copilot_mode_quality()}
        />
      ) : (
        <Link
          to="/app/tarifs"
          aria-label={m.copilot_mode_locked_aria()}
          title={m.copilot_mode_locked_aria()}
          className="inline-flex items-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <Lock className="size-3.5" />
          {m.copilot_mode_quality()}
        </Link>
      )}
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
