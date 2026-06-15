import { useCallback, useRef, useState } from 'react'
import { useAction, useMutation } from 'convex/react'
import { useThreadMessages, toUIMessages } from '@convex-dev/agent/react'
import { api } from '../../../convex/_generated/api'
import { toast } from '~/components/ui/sonner'
import { m } from '~/lib/paraglide/messages'

export type CopilotMode = 'fast' | 'quality'

/**
 * Orchestrateur du copilote : gestion du fil courant, envoi de message (avec
 * mode rapide/qualité), flux des messages (streaming via le hook Agent), et
 * arbitrage des demandes d'approbation d'outils d'écriture (respondApproval +
 * relance du dernier prompt).
 *
 * Le flux d'approbation est médié côté client : un outil d'écriture en mode
 * `ask` renvoie `{ approvalRequired, tool, summary }` ; l'UI affiche une carte,
 * puis `approve(tool, decision)` appelle `respondApproval` et relance le prompt.
 */
export function useCopilot(onCreditExhausted?: () => void) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [mode, setMode] = useState<CopilotMode>('fast')
  const [sending, setSending] = useState(false)
  const lastPrompt = useRef<string>('')

  const createThread = useMutation(api.aiChat.createThread)
  const sendMessage = useAction(api.aiChat.sendMessage)
  const respondApproval = useMutation(api.aiChat.respondApproval)

  const messages = useThreadMessages(
    api.aiChat.listMessages,
    threadId ? { threadId } : 'skip',
    { initialNumItems: 50, stream: true },
  )

  const uiMessages = threadId ? toUIMessages(messages.results ?? []) : []

  const ensureThread = useCallback(async (): Promise<string> => {
    if (threadId) return threadId
    const { threadId: id } = await createThread({})
    setThreadId(id)
    return id
  }, [threadId, createThread])

  const deliver = useCallback(
    async (id: string, prompt: string) => {
      try {
        await sendMessage({ threadId: id, prompt, mode })
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (message.startsWith('AI_CREDIT:')) {
          toast.error(m.copilot_credits_empty_title())
          onCreditExhausted?.()
          return
        }
        toast.error(m.copilot_error())
      }
    },
    [sendMessage, mode, onCreditExhausted],
  )

  const send = useCallback(
    async (prompt: string) => {
      const text = prompt.trim()
      if (!text || sending) return
      lastPrompt.current = text
      setSending(true)
      try {
        const id = await ensureThread()
        await deliver(id, text)
      } finally {
        setSending(false)
      }
    },
    [sending, ensureThread, deliver],
  )

  const approve = useCallback(
    async (tool: string, decision: 'once' | 'always' | 'deny') => {
      const { approved } = await respondApproval({ tool, decision })
      if (!approved) {
        toast.message(m.copilot_approve_denied())
        return
      }
      // Relance le dernier prompt : l'outil est désormais autorisé.
      if (threadId && lastPrompt.current) {
        setSending(true)
        try {
          await deliver(threadId, lastPrompt.current)
        } finally {
          setSending(false)
        }
      }
    },
    [respondApproval, threadId, deliver],
  )

  const reset = useCallback(() => {
    setThreadId(null)
    lastPrompt.current = ''
  }, [])

  return {
    threadId,
    mode,
    setMode,
    sending,
    uiMessages,
    streaming: messages.status === 'LoadingFirstPage',
    send,
    approve,
    reset,
  }
}
