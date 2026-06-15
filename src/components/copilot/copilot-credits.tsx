import { useQuery } from 'convex/react'
import { Coins } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'

/**
 * Compteur de crédits IA : solde mensuel + pack, avec une jauge sobre de la
 * consommation du mois. Numéros en `.assay` (mono). Masqué si non disponible.
 */
export function CopilotCredits() {
  const credits = useQuery(api.aiCredits.myCredits, {})
  if (!credits) return null

  const total = credits.balance + credits.packBalance
  const allowance = credits.monthlyAllowance || 1
  const used = Math.min(credits.monthCreditsUsed, allowance)
  const pct = Math.max(0, Math.min(100, (used / allowance) * 100))

  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
          <Coins className="size-3.5" />
          {m.copilot_credits_label()}
        </span>
        <span className="text-xs text-fg">
          <span className="assay font-medium text-fg">{total}</span>{' '}
          {m.copilot_credits_remaining()}
          {credits.packBalance > 0 && (
            <span className="ml-1 text-fg-subtle">
              (<span className="assay">{credits.packBalance}</span>{' '}
              {m.copilot_credits_pack()})
            </span>
          )}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-fg-subtle">
        <span className="assay">{credits.monthCreditsUsed}</span>
        {' / '}
        <span className="assay">{credits.monthlyAllowance}</span>{' '}
        {m.copilot_credits_used()}
      </p>
    </div>
  )
}
