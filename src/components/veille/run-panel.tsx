import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Loader2,
  PackageOpen,
  Radar,
  TimerReset,
} from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
import { CONNECTOR_META } from '../../../convex/veille/connectors'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import { INTENT_LABELS, type VeilleIntent } from './meta'

/** Résultat riche d'un passage `runNow` (miroir du type backend). */
export type RunResult = {
  imported: number
  throttled?: boolean
  retryInSec?: number
  sources: { id: string; label: string; ok: boolean; scanned: number }[]
  captures: {
    opportunityId: Id<'opportunities'>
    title: string
    source: string
    intent: VeilleIntent
  }[]
}

/** État courant du panneau de run : analyse en cours, résultat, ou erreur. */
export type RunPanelState =
  | { phase: 'analyzing' }
  | { phase: 'result'; result: RunResult }
  | { phase: 'error' }
  | { phase: 'no-search' }

export function RunPanel({
  open,
  onOpenChange,
  state,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: RunPanelState
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
              <Radar className="size-4" />
            </span>
            {state.phase === 'analyzing'
              ? 'Analyse de vos sources'
              : state.phase === 'result' && state.result.imported > 0
                ? `${state.result.imported} nouvelle${state.result.imported > 1 ? 's' : ''} offre${state.result.imported > 1 ? 's' : ''} captée${state.result.imported > 1 ? 's' : ''}`
                : 'Passage de veille'}
          </SheetTitle>
          <SheetDescription>
            {state.phase === 'analyzing'
              ? 'Filon parcourt vos sources surveillées en temps réel.'
              : 'Résultat du dernier passage manuel.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {state.phase === 'analyzing' && <AnalyzingView />}
          {state.phase === 'error' && <ErrorView />}
          {state.phase === 'no-search' && <NoSearchView />}
          {state.phase === 'result' && <ResultView result={state.result} />}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {state.phase === 'result' && state.result.imported > 0 && (
            <Button asChild>
              <Link to="/app/pipeline">
                Voir le pipeline
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Phase analyse : chaque source connue avec un état animé « Analyse… ». */
function AnalyzingView() {
  return (
    <ul className="space-y-2.5">
      {CONNECTOR_META.map((source, i) => (
        <li
          key={source.id}
          className="reveal flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3"
          style={{ '--reveal-i': i } as React.CSSProperties}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">
              {source.label}
            </p>
            <p className="truncate text-xs text-fg-subtle">{source.host}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-fg-muted">
            <Loader2 className="size-3.5 animate-spin text-accent" />
            Analyse…
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Phase résultat : récap par source, puis liste des captures (ou état vide). */
function ResultView({ result }: { result: RunResult }) {
  if (result.throttled) {
    const seconds = result.retryInSec ?? 60
    return (
      <EmptyResult
        icon={<TimerReset className="size-7" />}
        title="Veille déjà lancée"
        body={`Pour ménager les sources, réessayez dans ${seconds}s.`}
      />
    )
  }

  return (
    <div className="space-y-5">
      <SourcesRecap sources={result.sources} />

      {result.imported > 0 ? (
        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold text-fg">Offres captées</h3>
          <ul className="space-y-2.5">
            {result.captures.map((capture, i) => (
              <li
                key={capture.opportunityId}
                className="reveal flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3"
                style={{ '--reveal-i': i } as React.CSSProperties}
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="line-clamp-2 text-sm font-medium text-fg">
                    {capture.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{capture.source}</Badge>
                    <Badge variant="accent">
                      {INTENT_LABELS[capture.intent]}
                    </Badge>
                  </div>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                >
                  <Link
                    to="/app/opportunites/$id"
                    params={{ id: capture.opportunityId }}
                    search={{ view: 'liste' }}
                  >
                    Voir
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyResult
          icon={<PackageOpen className="size-7" />}
          title="Aucune nouvelle offre"
          body="Tout ce qui correspond est déjà dans votre pipeline."
        />
      )}
    </div>
  )
}

/** Récap compact « source · N analysées » avec pastille de santé. */
function SourcesRecap({ sources }: { sources: RunResult['sources'] }) {
  if (sources.length === 0) return null
  return (
    <ul className="space-y-1.5">
      {sources.map((source) => (
        <li
          key={source.id}
          className="flex items-center gap-2 text-xs text-fg-muted"
        >
          <span
            aria-hidden
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              source.ok ? 'bg-success' : 'bg-danger',
            )}
          />
          <span className="font-medium text-fg">{source.label}</span>
          <span className="text-fg-subtle">
            {source.ok
              ? `${source.scanned} analysée${source.scanned > 1 ? 's' : ''}`
              : 'indisponible'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function EmptyResult({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="reveal flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
        {icon}
      </span>
      <div className="max-w-xs space-y-1">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
      </div>
    </div>
  )
}

function NoSearchView() {
  return (
    <EmptyResult
      icon={<Radar className="size-7" />}
      title="Aucune veille active"
      body="Créez une veille avec quelques mots-clés pour démarrer la capture."
    />
  )
}

function ErrorView() {
  return (
    <EmptyResult
      icon={<PackageOpen className="size-7" />}
      title="Le passage a échoué"
      body="Une erreur est survenue pendant l'analyse. Réessayez dans un instant."
    />
  )
}
