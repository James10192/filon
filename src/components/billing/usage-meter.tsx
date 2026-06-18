import { Link } from '@tanstack/react-router'
import { m } from '~/lib/paraglide/messages'
import { useUpsell } from '~/lib/billing/use-upsell'
import { cn } from '~/lib/utils'
import { ProgressBar } from '~/components/ui/progress-bar'

/**
 * Compteur d'usage discret (chiffres `.assay` mono) qui devient une invitation
 * à l'approche du plafond. Aucun bruit tant qu'on est loin du cap : c'est de la
 * friction « en amont du mur », pas un nag.
 *
 * - free, sous le seuil      → barre neutre « 18 / 25 ».
 * - free, proche du cap      → barre accentuée + ligne « Bientôt au plafond.
 *                               Passez à Pro pour un pipeline illimité. »
 * - pro / pro_ai (illimité)  → ne rend RIEN (jamais harceler un payeur).
 *
 * `limit = null` (illimité) ⇒ rien. Le seuil d'escalade est à 85 % du cap.
 */
export function UsageMeter({
  label,
  used,
  limit,
  className,
}: {
  label: string
  used: number
  limit: number | null
  className?: string
}) {
  const { plan } = useUpsell()

  // Palier illimité ou pas de plafond : aucun compteur.
  if (limit === null || plan !== 'free') return null

  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0
  const pct = Math.round(ratio * 100)
  const near = ratio >= 0.85

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border bg-surface px-4 py-3 shadow-[var(--shadow-card)]',
        near ? 'border-accent/40' : 'border-border',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="assay text-sm text-fg-muted">
          {used} / {limit}
        </span>
      </div>
      <ProgressBar
        percent={pct}
        className="mt-2"
        barClassName={near ? 'bg-accent' : 'bg-fg-subtle/50'}
      />
      {near && (
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">
          {m.app_usage_near_cap()}{' '}
          <Link
            to="/app/tarifs"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {m.app_usage_upgrade_cta()}
          </Link>
        </p>
      )}
    </div>
  )
}
