import { useCallback, useEffect, useRef, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useThreadMessages, toUIMessages } from '@convex-dev/agent/react'
import { api } from '../../../convex/_generated/api'
import { toast } from '~/components/ui/sonner'
import { m } from '~/lib/paraglide/messages'
import { aiCreditMessage } from '~/lib/billing/plan'

export type CopilotMode = 'fast' | 'quality'

/**
 * Orchestrateur du copilote : liste des fils (historique), fil courant, envoi de
 * message (mode rapide/qualité), flux streamé, et arbitrage des approbations
 * d'écriture. À l'ouverture, reprend le dernier fil (continuité) ; « Nouveau »
 * repart d'un fil vierge.
 */
export function useCopilot(onCreditExhausted?: () => void) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [mode, setMode] = useState<CopilotMode>('fast')
  const [sending, setSending] = useState(false)
  const lastPrompt = useRef<string>('')
  const didInit = useRef(false)

  const threads = useQuery(api.aiChat.listThreads, {}) ?? []
  const createThread = useMutation(api.aiChat.createThread)
  const renameThread = useMutation(api.aiChat.renameThread)
  const sendMessage = useAction(api.aiChat.sendMessage)
  const respondApproval = useMutation(api.aiChat.respondApproval)

  // Reprise du dernier fil au premier chargement (decision 7). Une seule fois :
  // ensuite « Nouveau » / sélection priment.
  useEffect(() => {
    if (didInit.current || threads.length === 0) return
    didInit.current = true
    setThreadId(threads[0].threadId)
  }, [threads])

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
        if (aiCreditMessage(error)) {
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

  const selectThread = useCallback((id: string) => {
    setThreadId(id)
    lastPrompt.current = ''
  }, [])

  const newThread = useCallback(() => {
    didInit.current = true
    setThreadId(null)
    lastPrompt.current = ''
  }, [])

  const rename = useCallback(
    (id: string, title: string) => renameThread({ threadId: id, title }),
    [renameThread],
  )

  return {
    threads,
    threadId,
    mode,
    setMode,
    sending,
    uiMessages,
    streaming: messages.status === 'LoadingFirstPage',
    send,
    approve,
    selectThread,
    newThread,
    rename,
  }
}
