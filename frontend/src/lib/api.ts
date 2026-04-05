import type { Message, BenchmarkResult, StructuredOutput } from '@/types'

// ---------------------------------------------------------------------------
// Chat streaming — yields tokens one by one via async generator
// ---------------------------------------------------------------------------

export interface ChatBody {
  model: string
  messages: Array<{ role: string; content: string }>
  temperature: number
  system?: string
}

export async function* streamChat(
  body: ChatBody,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()!

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const d = JSON.parse(line.slice(6)) as { token?: string; done?: boolean }
        if (d.token) yield d.token
        if (d.done) return
      } catch {
        // malformed SSE frame — ignore
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export async function fetchModels(): Promise<string[]> {
  const res = await fetch('/api/models')
  const data = (await res.json()) as { models: string[] }
  return data.models ?? []
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export async function fetchHealth(): Promise<{ status: string; ollama: boolean }> {
  const res = await fetch('/api/health')
  return res.json()
}

// ---------------------------------------------------------------------------
// Benchmark
// ---------------------------------------------------------------------------

export interface BenchmarkBody {
  model: string
  limit: number
  trials: number
  temperature: number
}

export async function runBenchmark(
  body: BenchmarkBody,
): Promise<BenchmarkResult[]> {
  const res = await fetch('/api/benchmark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as { results: BenchmarkResult[] }
  return data.results
}

// ---------------------------------------------------------------------------
// Structured output
// ---------------------------------------------------------------------------

export interface StructuredBody {
  model: string
  prompt: string
  temperature: number
}

export async function runStructured(
  body: StructuredBody,
): Promise<{ success: boolean; data?: StructuredOutput; error?: string }> {
  const res = await fetch('/api/structured', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// Re-export Message for convenience
export type { Message }
