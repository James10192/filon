import { Link } from '@tanstack/react-router'
import { Sparkles, Coins } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'

/**
 * Écran d'incitation : affiché quand l'utilisateur n'a pas le palier Copilot
 * (`variant='access'`) ou a épuisé ses crédits (`variant='credits'`). Pointe
 * vers les tarifs ; mentionne les packs de crédits.
 */
export function CopilotUpsell({
  variant = 'access',
  onNavigate,
}: {
  variant?: 'access' | 'credits'
  onNavigate?: () => void
}) {
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
