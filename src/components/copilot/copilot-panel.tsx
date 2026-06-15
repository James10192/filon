import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { Coins } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { useCopilot } from './use-copilot'
import { CopilotCredits } from './copilot-credits'
import { CopilotConversation } from './copilot-conversation'
import { CopilotPrompt } from './copilot-prompt'
import { CopilotUpsell } from './copilot-upsell'

/**
 * Panneau copilote assemblé : crédits + conversation streamée + saisie. Réutilisé
 * par le tiroir (slide-over) et la route plein écran /app/copilot.
 *
 * Gating : chargement -> squelette ; pas d'accès au palier Copilot -> upsell
 * d'accès ; crédits épuisés en cours d'usage -> bandeau de recharge au-dessus de
 * la saisie (la conversation reste visible).
 */
export function CopilotPanel({ onNavigate }: { onNavigate?: () => void }) {
  const credits = useQuery(api.aiCredits.myCredits, {})
  const [exhausted, setExhausted] = useState(false)
  const copilot = useCopilot(() => setExhausted(true))

  if (credits === undefined) return <PanelSkeleton />

  if (!credits || !credits.aiAccess) {
    return <CopilotUpsell variant="access" onNavigate={onNavigate} />
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border p-3">
        <CopilotCredits />
      </div>
      <CopilotConversation
        messages={copilot.uiMessages}
        sending={copilot.sending}
        onPick={copilot.send}
        onDecision={copilot.approve}
      />
      <div className="shrink-0 space-y-2.5 border-t border-border p-3">
        {exhausted && (
          <div className="flex items-center gap-2.5 rounded-[var(--radius)] border border-accent/30 bg-accent/5 px-3 py-2">
            <Coins className="size-4 shrink-0 text-accent" />
            <p className="min-w-0 flex-1 text-xs text-fg-muted">
              {m.copilot_credits_empty_desc()}
            </p>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/app/tarifs" onClick={onNavigate}>
                {m.copilot_recharge()}
              </Link>
            </Button>
          </div>
        )}
        <CopilotPrompt
          mode={copilot.mode}
          onModeChange={copilot.setMode}
          sending={copilot.sending}
          onSubmit={copilot.send}
        />
      </div>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <Skeleton className="h-14 w-full" />
      <div className="flex-1 space-y-3 py-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="ml-auto h-16 w-2/3" />
        <Skeleton className="h-20 w-3/4" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
