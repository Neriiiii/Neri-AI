import { useState, useRef, useCallback } from 'react'
import type { Message, Conversation } from '@/types'
import { streamChat } from '@/lib/api'
import { updateConversation, autoTitle } from '@/lib/conversations'

interface UseChatOptions {
  conversation: Conversation
  model: string
  temperature: number
  onConversationUpdate: (conv: Conversation) => void
}

export function useChat({
  conversation,
  model,
  temperature,
  onConversationUpdate,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>(conversation.messages)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Keep messages in sync when conversation changes (sidebar navigation)
  const syncMessages = useCallback((msgs: Message[]) => {
    setMessages(msgs)
  }, [])

  const persist = useCallback(
    (msgs: Message[]) => {
      const updated: Conversation = {
        ...conversation,
        messages: msgs,
        title: autoTitle(msgs),
        model,
        updatedAt: Date.now(),
      }
      updateConversation(conversation.id, updated)
      onConversationUpdate(updated)
    },
    [conversation, model, onConversationUpdate],
  )

  const sendMessage = useCallback(
    async (userText: string, systemPrompt?: string) => {
      if (isStreaming) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      }

      const newMessages = [...messages, userMsg, assistantMsg]
      setMessages(newMessages)
      setIsStreaming(true)

      const ctrl = new AbortController()
      abortRef.current = ctrl

      // Build history for the API (exclude the empty assistant placeholder)
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      let accumulated = ''

      try {
        for await (const token of streamChat(
          { model, messages: history, temperature, system: systemPrompt || undefined },
          ctrl.signal,
        )) {
          accumulated += token
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: accumulated } : m,
            ),
          )
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User stopped — keep partial response, don't show error
        } else {
          accumulated = accumulated || `Error: ${String(err)}`
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null

        // Finalise the assistant message
        const finalMessages = newMessages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: accumulated, isStreaming: false }
            : m,
        )
        setMessages(finalMessages)
        persist(finalMessages)
      }
    },
    [messages, isStreaming, model, temperature, persist],
  )

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const regenerateLast = useCallback(
    async (systemPrompt?: string) => {
      if (isStreaming) return
      // Remove the last assistant message and re-run
      const withoutLast = messages.slice(0, -1)
      const lastUser = withoutLast[withoutLast.length - 1]
      if (!lastUser || lastUser.role !== 'user') return
      setMessages(withoutLast)
      await sendMessage(lastUser.content, systemPrompt)
    },
    [messages, isStreaming, sendMessage],
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isStreaming,
    sendMessage,
    stopGeneration,
    regenerateLast,
    clearMessages,
    syncMessages,
  }
}
