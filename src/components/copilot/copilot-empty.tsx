import { Sparkles } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Suggestions, Suggestion } from '~/components/ai-elements/suggestion'

/**
 * État vide du copilote : accroche + prompts suggérés qui pré-remplissent et
 * envoient directement le message.
 */
export function CopilotEmpty({ onPick }: { onPick: (prompt: string) => void }) {
  const suggestions = [
    m.copilot_suggest_pipeline(),
    m.copilot_suggest_followups(),
    m.copilot_suggest_priorities(),
    m.copilot_suggest_create(),
  ]

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Sparkles className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-fg">
          {m.copilot_empty_title()}
        </h2>
        <p className="mx-auto max-w-sm text-sm text-fg-muted">
          {m.copilot_empty_desc()}
        </p>
      </div>
      <Suggestions className="justify-center">
        {suggestions.map((s) => (
          <Suggestion key={s} suggestion={s} onClick={onPick} />
        ))}
      </Suggestions>
    </div>
  )
}
