import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { Check, Copy, Sparkles, RefreshCw } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { aiCreditMessage } from '~/lib/billing/plan'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import { Spinner } from '~/components/ui/spinner'
import { toast } from '~/components/ui/sonner'
import { cn } from '~/lib/utils'

/**
 * Carte d'analyse IA « à l'acte » sur la fiche d'une opportunité.
 *
 * Gate par CRÉDITS (modèle dégustation), pas par palier : tant que le solde
 * combiné (`balance + packBalance`) est positif, l'utilisateur peut lancer
 * l'analyse et le brouillon. Sinon, on affiche un teaser verrouillé qui mène
 * aux forfaits. Le débit est géré côté serveur.
 *
 * États :
 *  - loading : `signalFor` ou `myCredits` indéfinis.
 *  - C (verrouillé) : pas d'accès / solde épuisé.
 *  - A (à analyser) : aucun signal encore, crédits OK.
 *  - B (analysé) : score + action + justification + brouillon.
 */
export function AiSignalCard({
  opportunityId,
}: {
  opportunityId: Id<'opportunities'>
}) {
  const signal = useQuery(api.veille.aiData.signalFor, { opportunityId })
  const credits = useQuery(api.aiCredits.myCredits, {})
  const analyzeSignal = useAction(api.veille.ai.analyzeSignal)
  const draftMessage = useAction(api.veille.ai.draftMessage)

  const [analyzing, setAnalyzing] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [copied, setCopied] = useState(false)

  const loading = signal === undefined || credits === undefined

  function handleAiError(error: unknown) {
    const msg = aiCreditMessage(error)
    if (msg) {
      toast.error(msg, {
        action: {
          label: 'Voir les forfaits',
          onClick: () => {
            window.location.href = '/app/tarifs'
          },
        },
      })
      return
    }
    toast.error("L'analyse IA a échoué. Réessayez dans un instant.")
  }

  async function handleAnalyze(force = false) {
    setAnalyzing(true)
    try {
      await analyzeSignal({ opportunityId, force })
    } catch (error) {
      handleAiError(error)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleDraft() {
    setDrafting(true)
    try {
      await draftMessage({ opportunityId })
    } catch (error) {
      handleAiError(error)
    } finally {
      setDrafting(false)
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Brouillon copié.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('La copie a échoué.')
    }
  }

  if (loading) return <AiSignalSkeleton />

  const balance = credits ? credits.balance + credits.packBalance : 0
  const locked = !credits || !credits.aiAccess || balance <= 0

  // État C : crédits épuisés / pas d'accès → teaser verrouillé premium.
  if (locked && signal === null) {
    return <AiSignalLocked />
  }

  return (
    <Shell>
      <header className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
          <Sparkles className="size-4" />
        </span>
        <h2 className="text-base font-semibold text-fg">Analyse IA</h2>
      </header>

      {signal === null ? (
        // État A : pas encore analysé, crédits OK.
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Laissez l'IA évaluer cette opportunité et vous dire s'il vaut mieux
            postuler ou démarcher.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              disabled={analyzing}
              onClick={() => handleAnalyze(false)}
            >
              {analyzing ? (
                <>
                  <Spinner />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Analyser avec l'IA
                </>
              )}
            </Button>
            <CreditsHint balance={balance} />
          </div>
        </div>
      ) : (
        // État B : analysé.
        <div className="space-y-5">
          <ScoreBlock score={signal.score} action={signal.suggestedAction} />

          <p className="whitespace-pre-wrap break-words text-sm text-fg-muted">
            {signal.rationale}
          </p>

          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-fg">Premier message</h3>
            {signal.draft ? (
              <div className="space-y-2">
                <div className="rounded-[var(--radius)] border border-border bg-surface-2 p-3">
                  <p className="whitespace-pre-wrap break-words text-sm text-fg">
                    {signal.draft}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(signal.draft as string)}
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
            ) : locked ? (
              <p className="text-sm text-fg-subtle">
                Solde de crédits épuisé pour générer un brouillon.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={drafting}
                  onClick={handleDraft}
                >
                  {drafting ? (
                    <>
                      <Spinner />
                      Rédaction…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Rédiger le 1er message
                    </>
                  )}
                </Button>
                <CreditsHint balance={balance} />
              </div>
            )}
          </div>

          {!locked && (
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <CreditsHint balance={balance} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={analyzing}
                onClick={() => handleAnalyze(true)}
              >
                {analyzing ? <Spinner /> : <RefreshCw className="size-4" />}
                Re-analyser
              </Button>
            </div>
          )}
        </div>
      )}
    </Shell>
  )
}

/** Conteneur carte commun, aligné sur le composant `Panel` du détail. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      {children}
    </div>
  )
}

/** Solde de crédits discret, affiché uniquement quand il est positif. */
function CreditsHint({ balance }: { balance: number }) {
  if (balance <= 0) return null
  return (
    <p className="text-xs text-fg-subtle">
      {balance.toLocaleString('fr-FR')}{' '}
      {balance > 1 ? 'crédits restants' : 'crédit restant'}
    </p>
  )
}

const ACTION_META = {
  apply: { label: 'Postuler', variant: 'success' as const },
  prospect: { label: 'Démarcher', variant: 'accent' as const },
  ignore: { label: 'Ignorer', variant: 'outline' as const },
}

/** Score /100 (anneau coloré) + badge d'action recommandée. */
function ScoreBlock({
  score,
  action,
}: {
  score: number
  action: 'apply' | 'prospect' | 'ignore'
}) {
  const tone =
    score >= 70
      ? { ring: 'text-success', label: 'text-success' }
      : score >= 40
        ? { ring: 'text-accent', label: 'text-accent' }
        : { ring: 'text-fg-subtle', label: 'text-fg-subtle' }
  const meta = ACTION_META[action]
  const clamped = Math.max(0, Math.min(100, Math.round(score)))

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-20 shrink-0">
        <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className="stroke-border"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            className={cn(tone.ring, 'transition-all duration-500')}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${clamped} 100`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-xl font-semibold tabular-nums', tone.label)}>
            {clamped}
          </span>
          <span className="text-[10px] font-medium text-fg-subtle">/ 100</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Action recommandée
        </p>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
    </div>
  )
}

/** État C : teaser verrouillé premium menant aux forfaits. */
function AiSignalLocked() {
  return (
    <Shell>
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
          <Sparkles className="size-4" />
        </span>
        <h2 className="text-base font-semibold text-fg">Analyse IA</h2>
      </header>
      <p className="mb-4 text-sm text-fg-muted">
        Un score de pertinence, l'action à privilégier (postuler ou démarcher)
        et un brouillon de premier message, générés pour cette opportunité.
      </p>
      <Button
        type="button"
        className="w-full"
        onClick={() => {
          window.location.href = '/app/tarifs'
        }}
      >
        Voir les forfaits
      </Button>
    </Shell>
  )
}

function AiSignalSkeleton() {
  return (
    <Shell>
      <div className="mb-4 flex items-center gap-2.5">
        <Skeleton className="size-8 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-5 w-28" />
      </div>
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-4 h-4 w-2/3" />
      <Skeleton className="h-11 w-full rounded-[var(--radius)]" />
    </Shell>
  )
}
