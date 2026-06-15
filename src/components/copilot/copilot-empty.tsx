import {
  Sparkles,
  BarChart3,
  BellRing,
  Target,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

/**
 * État vide du copilote : un point de départ vendeur. Halo d'accent derrière
 * l'icône, accroche, puis une grille de prompts suggérés (icône + texte) qui
 * pré-remplissent et envoient directement. Remplit l'espace avec intention
 * plutôt que de laisser un grand vide.
 */
export function CopilotEmpty({ onPick }: { onPick: (prompt: string) => void }) {
  const suggestions: { icon: LucideIcon; text: string }[] = [
    { icon: BarChart3, text: m.copilot_suggest_pipeline() },
    { icon: BellRing, text: m.copilot_suggest_followups() },
    { icon: Target, text: m.copilot_suggest_priorities() },
    { icon: PlusCircle, text: m.copilot_suggest_create() },
  ]

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">
      <div className="relative mb-5">
        <div
          aria-hidden
          className="absolute -inset-4 rounded-full bg-accent/20 blur-2xl"
        />
        <span className="relative flex size-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent shadow-[var(--shadow-sm)]">
          <Sparkles className="size-7" />
        </span>
      </div>

      <h2 className="text-balance text-center text-lg font-semibold tracking-[-0.02em] text-fg">
        {m.copilot_empty_title()}
      </h2>
      <p className="mt-1.5 max-w-sm text-balance text-center text-sm text-fg-muted">
        {m.copilot_empty_desc()}
      </p>

      <div className="mt-7 grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
        {suggestions.map(({ icon: Icon, text }) => (
          <button
            key={text}
            type="button"
            onClick={() => onPick(text)}
            className="group flex items-start gap-3 rounded-[var(--radius)] border border-border bg-surface px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2 hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"
          >
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-fg">
              <Icon className="size-4" />
            </span>
            <span className="text-sm leading-snug text-fg">{text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
