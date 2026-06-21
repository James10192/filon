import { Link } from '@tanstack/react-router'
import { Sparkles, Coins, Gauge, Check } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'

type Variant = 'access' | 'credits' | 'max'

/**
 * Écran d'incitation du copilote, trois variantes :
 *  - `access`  : l'utilisateur n'a pas le palier Copilot (débloquer l'agent).
 *  - `credits` : crédits IA épuisés (recharger / monter de palier).
 *  - `max`     : l'utilisateur a Copilot mais pas Copilot Max ; on rend l'écart
 *    explicite (brief du jour, intelligence d'équipe, raisonnement étendu,
 *    routage prioritaire) pour justifier le palier supérieur.
 */
export function CopilotUpsell({
  variant = 'access',
  onNavigate,
}: {
  variant?: Variant
  onNavigate?: () => void
}) {
  if (variant === 'max') return <MaxUpsell onNavigate={onNavigate} />

  const isCredits = variant === 'credits'
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        {isCredits ? (
          <Coins className="size-6" />
        ) : (
          <Sparkles className="size-6" />
        )}
      </span>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-fg">
          {isCredits
            ? m.copilot_credits_empty_title()
            : m.copilot_upsell_title()}
        </h2>
        <p className="mx-auto max-w-sm text-sm text-fg-muted">
          {isCredits ? m.copilot_credits_empty_desc() : m.copilot_upsell_desc()}
        </p>
      </div>
      <Button asChild className="h-11">
        <Link to="/app/tarifs" onClick={onNavigate}>
          <Sparkles className="size-4" />
          {m.copilot_upsell_cta()}
        </Link>
      </Button>
      <p className="max-w-xs text-xs text-fg-subtle">
        {m.copilot_upsell_packs()}
      </p>
    </div>
  )
}

/** Variante Copilot Max : liste l'écart premium (flagship du palier supérieur). */
function MaxUpsell({ onNavigate }: { onNavigate?: () => void }) {
  const perks = [
    m.copilot_max_upsell_perk_brief(),
    m.copilot_max_upsell_perk_team(),
    m.copilot_max_upsell_perk_reasoning(),
    m.copilot_max_upsell_perk_routing(),
  ]
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Gauge className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-fg">
          {m.copilot_max_upsell_title()}
        </h2>
        <p className="mx-auto max-w-sm text-sm text-fg-muted">
          {m.copilot_max_upsell_desc()}
        </p>
      </div>
      <ul className="mx-auto w-full max-w-xs space-y-2 text-left">
        {perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2 text-sm text-fg">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>{perk}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="h-11">
        <Link to="/app/tarifs" onClick={onNavigate}>
          <Sparkles className="size-4" />
          {m.copilot_max_upsell_cta()}
        </Link>
      </Button>
    </div>
  )
}
