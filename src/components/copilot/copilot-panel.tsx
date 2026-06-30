import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import {
  Coins,
  BookOpen,
  PanelLeft,
  MessagesSquare,
  ListChecks,
  Sparkles,
  Sun,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { useCopilot } from './use-copilot'
import { CopilotCredits } from './copilot-credits'
import { CopilotConversation } from './copilot-conversation'
import { CopilotPrompt } from './copilot-prompt'
import { CopilotUpsell } from './copilot-upsell'
import { CopilotThreadsRail } from './copilot-threads-rail'
import { CopilotActivity } from './copilot-activity'
import { BriefWidget } from './brief/brief-widget'
import { CopilotHelp } from './copilot-help'

type Tab = 'conversation' | 'activity' | 'brief' | 'help'

/** Seed contextuel injecté par un bouton « Demander au copilote ». */
export type CopilotSeed = { prompt: string; nonce: number }

/**
 * Hub copilote assemblé : rail d'historique (repliable) + conversation streamée
 * ou journal d'actions, plus crédits et saisie. Réutilisé par le tiroir et la
 * route plein écran. Gating crédits/accès géré ici.
 *
 * `seed` (optionnel) : prompt contextuel injecté depuis une page. À sa
 * réception, on bascule sur l'onglet conversation, on démarre un nouveau fil et
 * on pré-remplit la saisie (l'utilisateur valide l'envoi).
 */
export function CopilotPanel({
  onNavigate,
  seed = null,
  initialTab,
}: {
  onNavigate?: () => void
  seed?: CopilotSeed | null
  /** Onglet d'ouverture (« brief » pour l'entrée « Brief du jour »). */
  initialTab?: Tab
}) {
  const credits = useQuery(api.aiCredits.myCredits, {})
  const [exhausted, setExhausted] = useState(false)
  // Rail d'historique ouvert par défaut sur grand écran, replié sur mobile (où
  // il occuperait la moitié de la largeur). `matchMedia` côté client uniquement.
  const [railOpen, setRailOpen] = useState(
    () =>
      typeof window === 'undefined' ||
      window.matchMedia('(min-width: 768px)').matches,
  )
  const [tab, setTab] = useState<Tab>(initialTab ?? 'conversation')
  const [draft, setDraft] = useState('')
  const copilot = useCopilot(() => setExhausted(true))

  // Consomme un seed (nonce) : nouveau fil + pré-remplissage de la saisie.
  useEffect(() => {
    if (!seed) return
    setTab('conversation')
    copilot.newThread()
    setDraft(seed.prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.nonce])

  // Narration « Priorise ma journée » : seed la saisie de la conversation
  // (l'utilisateur valide l'envoi : aucune consommation surprise de crédits).
  const narrate = (prompt: string) => {
    copilot.newThread()
    setDraft(prompt)
    setTab('conversation')
  }

  if (credits === undefined) return <PanelSkeleton />
  if (!credits || !credits.aiAccess) {
    return <CopilotUpsell variant="access" onNavigate={onNavigate} />
  }

  const showBrief = credits.plan === 'copilot_max'

  return (
    <div className="flex h-full min-h-0">
      <aside
        className={cn(
          'shrink-0 overflow-hidden border-r border-border bg-bg/40 transition-[width] duration-200',
          railOpen ? 'w-56' : 'w-0',
        )}
      >
        <div className="h-full w-56">
          <CopilotThreadsRail
            threads={copilot.threads}
            activeThreadId={copilot.threadId}
            onSelect={copilot.selectThread}
            onNew={() => {
              copilot.newThread()
              setTab('conversation')
            }}
            onRename={copilot.rename}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
          <button
            type="button"
            onClick={() => setRailOpen((v) => !v)}
            aria-label={m.copilot_history()}
            aria-pressed={railOpen}
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <PanelLeft className="size-4" />
          </button>
          <div className="inline-flex rounded-[var(--radius-sm)] border border-border bg-bg p-0.5">
            {showBrief && (
              <TabButton
                active={tab === 'brief'}
                onClick={() => setTab('brief')}
                icon={<Sun className="size-3.5" />}
                label={m.brief_tab()}
              />
            )}
            <TabButton
              active={tab === 'conversation'}
              onClick={() => setTab('conversation')}
              icon={<MessagesSquare className="size-3.5" />}
              label={m.copilot_conversation()}
            />
            <TabButton
              active={tab === 'activity'}
              onClick={() => setTab('activity')}
              icon={<ListChecks className="size-3.5" />}
              label={m.copilot_activity()}
            />
            <TabButton
              active={tab === 'help'}
              onClick={() => setTab('help')}
              icon={<BookOpen className="size-3.5" />}
              label="Aide Filon"
            />
          </div>
        </div>

        {tab === 'brief' && showBrief ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <BriefWidget onNarrate={narrate} onNavigate={onNavigate} />
          </div>
        ) : tab === 'help' ? (
          <CopilotHelp onPick={narrate} />
        ) : tab === 'activity' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CopilotActivity onNavigate={onNavigate} />
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-border p-3">
              <CopilotCredits />
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-gradient-to-b from-accent/[0.05] to-transparent"
              />
              <CopilotConversation
                messages={copilot.uiMessages}
                sending={copilot.sending}
                onPick={copilot.send}
                onDecision={copilot.approve}
                onNavigate={onNavigate}
              />
            </div>
            <div className="shrink-0 space-y-2.5 border-t border-border p-3">
              {exhausted ? (
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
              ) : (
                credits.status === 'fair_use' && (
                  <div className="flex items-center gap-2.5 rounded-[var(--radius)] border border-warning/30 bg-warning-soft px-3 py-2">
                    <Sparkles className="size-4 shrink-0 text-warning" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-fg">
                        {m.copilot_fair_use_title()}
                      </p>
                      <p className="text-[11px] text-fg-muted">
                        {m.copilot_fair_use_desc()}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                    >
                      <Link to="/app/tarifs" onClick={onNavigate}>
                        {m.copilot_recharge()}
                      </Link>
                    </Button>
                  </div>
                )
              )}
              <CopilotPrompt
                mode={copilot.mode}
                onModeChange={copilot.setMode}
                sending={copilot.sending}
                onSubmit={copilot.send}
                value={draft}
                onValueChange={setDraft}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TabButton({
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
        active ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function PanelSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <Skeleton className="h-9 w-full" />
      <div className="flex-1 space-y-3 py-4">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="ml-auto h-16 w-2/3" />
        <Skeleton className="h-20 w-3/4" />
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
