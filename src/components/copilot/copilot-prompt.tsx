import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { CopilotModeToggle } from './copilot-mode-toggle'
import { CopilotPermissionSelect } from './copilot-permission-select'
import type { CopilotMode } from './use-copilot'

/**
 * Zone de saisie du copilote : textarea auto-redimensionnée (Entrée pour
 * envoyer, Maj+Entrée pour un saut de ligne), bascule de mode et sélecteur
 * d'autonomie. Saisie contrôlée, vidée à l'envoi. `onSubmit` envoie le texte ;
 * le bouton reflète l'état (envoi / streaming). Composant custom (pas le
 * PromptInput d'ai-elements) pour un contrôle total et zéro dette.
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
  const [text, setText] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow : la hauteur suit le contenu, plafonnée (scroll au-delà).
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [text])

  function submit() {
    const value = text.trim()
    if (!value || sending) return
    onSubmit(value)
    setText('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const canSend = text.trim().length > 0 && !sending

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-sm)] transition-colors focus-within:border-border-strong focus-within:ring-2 focus-within:ring-[var(--color-accent-ring)]">
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={m.copilot_placeholder()}
        className="block max-h-40 w-full resize-none bg-transparent px-3.5 pt-3 pb-1.5 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <CopilotModeToggle mode={mode} onChange={onModeChange} />
          <CopilotPermissionSelect />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label={m.copilot_send()}
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] transition-colors',
            canSend
              ? 'bg-accent text-accent-fg hover:bg-accent-hover'
              : 'bg-surface-2 text-fg-subtle',
          )}
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </button>
      </div>
    </div>
  )
}
