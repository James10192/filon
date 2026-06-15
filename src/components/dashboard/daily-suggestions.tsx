import { useQuery } from 'convex/react'
import {
  Sparkles,
  BellRing,
  Hourglass,
  CalendarOff,
  Compass,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Suggestion, SuggestionKind } from '../../../convex/suggestions'
import { m } from '~/lib/paraglide/messages'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { AskCopilotButton } from '~/components/copilot/ask-copilot-button'

/** Présentation par type de suggestion : icône + libellés + seed copilote. */
function present(s: Suggestion): {
  icon: LucideIcon
  title: string
  desc: string
  seed: string
} {
  const c = { count: s.count }
  switch (s.kind) {
    case 'overdue_followups':
      return {
        icon: BellRing,
        title: m.suggestions_overdue_title(c),
        desc: m.suggestions_overdue_desc(),
        seed: m.suggestions_overdue_seed(c),
      }
    case 'stale_opportunities': {
      const d = { count: s.count, days: s.days ?? 10 }
      return {
        icon: Hourglass,
        title: m.suggestions_stale_title(c),
        desc: m.suggestions_stale_desc({ days: s.days ?? 10 }),
        seed: m.suggestions_stale_seed(d),
      }
    }
    case 'no_next_action':
      return {
        icon: CalendarOff,
        title: m.suggestions_noaction_title(c),
        desc: m.suggestions_noaction_desc(),
        seed: m.suggestions_noaction_seed(c),
      }
    case 'empty_pipeline':
      return {
        icon: Compass,
        title: m.suggestions_empty_pipeline_title(),
        desc: m.suggestions_empty_pipeline_desc(),
        seed: m.suggestions_empty_pipeline_seed(),
      }
  }
}

/**
 * « Suggestions du jour » : pistes d'action DÉTERMINISTES (aucun appel IA, zéro
 * crédit) calculées côté Convex à partir de l'état réel du pipeline. Chaque
 * carte porte un bouton Sparkles qui ouvre le copilote pré-rempli avec le bon
 * seed contextuel. États gérés : chargement, vide (tout sous contrôle), liste.
 */
export function DailySuggestions() {
  const suggestions = useQuery(api.suggestions.today, {})

  if (suggestions === undefined) return <DailySuggestionsSkeleton />

  const isEmpty = suggestions.length === 0

  return (
    <Card
      className="reveal flex flex-col"
      style={{ ['--reveal-i' as string]: 1 }}
    >
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Sparkles className="size-3.5" />
          </span>
          {m.suggestions_title()}
        </CardTitle>
        <p className="text-xs text-fg-subtle">{m.suggestions_subtitle()}</p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((s) => (
              <SuggestionCard key={s.kind} suggestion={s} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const { icon: Icon, title, desc, seed } = present(suggestion)
  const tone: Record<SuggestionKind, string> = {
    overdue_followups: 'text-danger bg-danger-soft',
    stale_opportunities: 'text-warning bg-warning-soft',
    no_next_action: 'text-accent bg-accent/10',
    empty_pipeline: 'text-accent bg-accent/10',
  }

  return (
    <li className="group flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-3.5 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${tone[suggestion.kind]}`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-semibold leading-snug text-fg">{title}</p>
          <p className="text-xs leading-snug text-fg-muted">{desc}</p>
        </div>
      </div>
      <AskCopilotButton
        seed={seed}
        size="sm"
        buttonVariant="outline"
        className="w-full justify-center"
        ariaLabel={m.suggestions_ask_aria({ label: title })}
      />
    </li>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-border bg-bg/40 px-6 py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-fg">
          {m.suggestions_empty_title()}
        </p>
        <p className="mx-auto max-w-xs text-xs text-fg-muted">
          {m.suggestions_empty_desc()}
        </p>
      </div>
      <AskCopilotButton
        seed={m.copilot_seed_week()}
        label={m.suggestions_empty_cta()}
        size="sm"
        buttonVariant="outline"
      />
    </div>
  )
}

export function DailySuggestionsSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-60" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[var(--radius)]" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
