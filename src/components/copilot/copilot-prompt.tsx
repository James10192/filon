import { m } from '~/lib/paraglide/messages'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
} from '~/components/ai-elements/prompt-input'
import { CopilotModeToggle } from './copilot-mode-toggle'
import { CopilotPermissionSelect } from './copilot-permission-select'
import type { CopilotMode } from './use-copilot'

/**
 * Zone de saisie du copilote : textarea (Entrée pour envoyer), bascule de mode
 * et sélecteur d'autonomie. `onSubmit` envoie le texte ; le bouton reflète
 * l'état (envoi / streaming).
 */
export function CopilotPrompt({
  mode,
  onModeChange,
  sending,
  onSubmit,
}: {
  mode: CopilotMode
  onModeChange: (mode: CopilotMode) => void
  sending: boolean
  onSubmit: (text: string) => void
}) {
  return (
    <PromptInput
      onSubmit={(message) => {
        if (message.text.trim()) onSubmit(message.text)
      }}
      className="rounded-[var(--radius)] border border-border bg-surface"
    >
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={m.copilot_placeholder()}
          disabled={sending}
        />
        <PromptInputFooter>
          <PromptInputTools>
            <CopilotModeToggle mode={mode} onChange={onModeChange} />
            <CopilotPermissionSelect />
          </PromptInputTools>
          <PromptInputSubmit
            status={sending ? 'submitted' : undefined}
            aria-label={m.copilot_send()}
          />
        </PromptInputFooter>
      </PromptInputBody>
    </PromptInput>
  )
}
