import type { Conversation, Message } from '@/types'

const STORAGE_KEY = 'local_ai_assistant_v1_conversations'
/** Prevents runaway storage growth; older messages are trimmed when exceeded. */
const MAX_BYTES = 4 * 1024 * 1024

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Conversation[]) : []
  } catch {
    return []
  }
}

/**
 * Serializes conversations to localStorage.
 * When the payload exceeds MAX_BYTES, each conversation is trimmed to its
 * 20 most recent messages to stay within the storage quota.
 */
function persistConversations(convs: Conversation[]): void {
  try {
    const serialized = JSON.stringify(convs)
    if (new Blob([serialized]).size > MAX_BYTES) {
      const trimmed = convs.map((c) => ({
        ...c,
        messages: c.messages.slice(-20),
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } else {
      localStorage.setItem(STORAGE_KEY, serialized)
    }
  } catch {
    // Silently ignore quota errors — stale data is preferable to a crash.
  }
}

export function createConversation(model: string, systemPrompt = ''): Conversation {
  const conv: Conversation = {
    id: crypto.randomUUID(),
    title: 'New chat',
    model,
    systemPrompt,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const convs = loadConversations()
  convs.unshift(conv)
  persistConversations(convs)
  return conv
}

export function updateConversation(id: string, patch: Partial<Conversation>): void {
  const convs = loadConversations().map((c) =>
    c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
  )
  persistConversations(convs)
}

export function deleteConversation(id: string): void {
  persistConversations(loadConversations().filter((c) => c.id !== id))
}

export function getConversation(id: string): Conversation | undefined {
  return loadConversations().find((c) => c.id === id)
}

/** Derives a title from the first user message, capped at 40 characters. */
export function autoTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New chat'
  return first.content.slice(0, 40) + (first.content.length > 40 ? '…' : '')
}

/** Converts a Unix timestamp to a human-readable relative string (e.g. "5m ago"). */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}
