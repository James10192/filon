import { useCallback, useEffect, useRef, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useThreadMessages, toUIMessages } from '@convex-dev/agent/react'
import { api } from '../../../convex/_generated/api'
import { toast } from '~/components/ui/sonner'
import { m } from '~/lib/paraglide/messages'
import { aiCreditMessage } from '~/lib/billing/plan'
import type { AssistantKind } from './assistant-kinds'

export type CopilotMode = 'fast' | 'quality'

export function useCopilot(
  assistantKind: AssistantKind,
  onCreditExhausted?: () => void,
) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [mode, setMode] = useState<CopilotMode>('fast')
  const [sending, setSending] = useState(false)
  const lastPrompt = useRef<string>('')
  const didInit = useRef(false)

  const threads =
    useQuery(api.aiChat.listThreads, { assistantKind }) ?? []
  const createThread = useMutation(api.aiChat.createThread)
  const renameThread = useMutation(api.aiChat.renameThread)
  const sendMessage = useAction(api.aiChat.sendMessage)
  const respondApproval = useMutation(api.aiApprovals.respondApproval)
  const reportError = useMutation(api.observability.reportClientError)

  useEffect(() => {
    didInit.current = false
    setThreadId(null)
    lastPrompt.current = ''
  }, [assistantKind])

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
    const { threadId: id } = await createThread({ assistantKind })
    setThreadId(id)
    return id
  }, [assistantKind, createThread, threadId])

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
        void reportError({
          feature: 'copilot',
          action: 'send_message',
          message:
            error instanceof Error ? error.message : 'Erreur copilote inconnue',
          route: '/app/copilot',
          metadata: JSON.stringify({ threadId: id, mode, assistantKind }),
        })
        toast.error(m.copilot_error())
      }
    },
    [assistantKind, mode, onCreditExhausted, reportError, sendMessage],
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
    [deliver, ensureThread, sending],
  )

  const approve = useCallback(
    async (tool: string, decision: 'once' | 'always' | 'deny') => {
      const { approved } = await respondApproval({ tool, decision })
      if (!approved) {
        toast.message(m.copilot_approve_denied())
        return
      }
      if (!threadId || !lastPrompt.current) return
      setSending(true)
      try {
        await deliver(threadId, lastPrompt.current)
      } finally {
        setSending(false)
      }
    },
    [deliver, respondApproval, threadId],
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
    assistantKind,
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
