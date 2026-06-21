import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { Coins } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { ProgressBar } from '~/components/ui/progress-bar'

/**
 * Compteur de crédits IA : solde (mensuel + pack) et jauge de consommation du
 * mois, avec la métaphore « recharge » (crédit téléphone). Numéros en `.assay`
 * (mono). Lien de recharge discret vers les tarifs. Masqué si non disponible.
 */
export function CopilotCredits() {
  const credits = useQuery(api.aiCredits.myCredits, {})
  if (!credits) return null

  const total = credits.balance + credits.packBalance
  const allowance = credits.monthlyAllowance || 1
  // En usage loyal (solde épuisé mais on sert encore), la jauge bascule sur le
  // plafond anti-abus : on montre la consommation au-delà de l'allocation et la
  // marge restante avant le mur dur, sans écrêter à 100 %.
  const overage = credits.status === 'fair_use'
  const ceiling = credits.ceiling || allowance
  const reference = overage ? ceiling : allowance
  const pct = Math.max(
    0,
    Math.min(100, (credits.monthCreditsUsed / reference) * 100),
  )

  return (
    <div className="rounded-[var(--radius)] border border-border bg-gradient-to-b from-surface to-bg px-3 py-2.5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
          <span className="flex size-5 items-center justify-center rounded-[var(--radius-sm)] bg-accent/10 text-accent">
            <Coins className="size-3" />
          </span>
          {m.copilot_credits_label()}
        </span>
        <span className="text-xs text-fg-muted">
          <span className="assay text-sm font-semibold text-fg">{total}</span>{' '}
          {m.copilot_credits_remaining()}
          {credits.packBalance > 0 && (
            <span className="ml-1 text-fg-subtle">
              (<span className="assay">{credits.packBalance}</span>{' '}
              {m.copilot_credits_pack()})
            </span>
          )}
        </span>
      </div>

      <ProgressBar
        percent={pct}
        className="mt-2"
        barClassName={overage ? 'bg-warning' : undefined}
      />

      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-[11px] text-fg-subtle">
          <span className="assay">{credits.monthCreditsUsed}</span>
          {' / '}
          <span className="assay">
            {overage ? credits.ceiling : credits.monthlyAllowance}
          </span>{' '}
          {m.copilot_credits_used()}
        </p>
        <Link
          to="/app/tarifs"
          className="text-[11px] font-medium text-accent transition-colors hover:text-accent-hover"
        >
          {m.copilot_recharge()}
        </Link>
      </div>

      {overage && (
        <p className="mt-1 text-[11px] font-medium text-warning">
          {m.copilot_credits_overage()}
        </p>
      )}
    </div>
  )
}
