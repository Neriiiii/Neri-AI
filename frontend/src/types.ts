export type Role = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
  isStreaming?: boolean
}

export interface Conversation {
  id: string
  title: string
  model: string
  systemPrompt: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface BenchmarkResult {
  model: string
  prompt_preview: string
  tokens_per_second: number
  time_to_first_token_ms: number
  total_latency_ms: number
  trials: number
  temperature: number
}

export interface StructuredOutput {
  title: string
  summary: string
  tags: string[]
}
