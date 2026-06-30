import { cn } from '~/lib/utils'
import {
  assistantKindDescription,
  assistantKindLabel,
  type AssistantKind,
} from './assistant-kinds'

export function CopilotAssistantSwitcher({
  value,
  onChange,
  canCoach,
}: {
  value: AssistantKind
  onChange: (kind: AssistantKind) => void
  canCoach: boolean
}) {
  const items: AssistantKind[] = canCoach
    ? ['support', 'pipeline', 'coach']
    : ['support', 'pipeline']

  return (
    <div className="grid gap-2 md:grid-cols-3">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            'rounded-[var(--radius)] border px-3 py-3 text-left transition-colors',
            value === item
              ? 'border-accent bg-accent/5'
              : 'border-border bg-bg hover:border-border-strong',
          )}
        >
          <p className="text-sm font-medium text-fg">
            {assistantKindLabel(item)}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {assistantKindDescription(item)}
          </p>
        </button>
      ))}
    </div>
  )
}
