import { useState } from 'react'
import { Play, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { runStructured } from '@/lib/api'
import type { StructuredOutput } from '@/types'

interface StructuredPanelProps {
  model: string
  temperature: number
}

export function StructuredPanel({ model, temperature }: StructuredPanelProps) {
  const [prompt, setPrompt] = useState('Explain what recursion is in programming.')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<StructuredOutput | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await runStructured({ model, prompt, temperature })
      if (res.success && res.data) setResult(res.data)
      else setError(res.error ?? 'Unknown error')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-5 space-y-4">
      {/* Prompt + run */}
      <div className="space-y-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="text-sm min-h-[72px]"
          placeholder="Enter your question or instruction…"
        />
        <div className="flex items-center gap-3">
          <Button size="sm" className="gap-2" onClick={run} disabled={loading || !prompt.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {loading ? 'Generating…' : 'Generate'}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>

      {/* Schema info */}
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pydantic Schema</p>
        <pre className="text-xs font-mono bg-muted rounded-md p-3 text-muted-foreground">{`class AIResponse(BaseModel):
    title: str
    summary: str
    tags: list[str]`}</pre>
        <p className="text-xs text-muted-foreground mt-2">
          Retries up to 3 times with a stricter prompt on parse failure.
        </p>
      </div>

      {/* Output */}
      {result && (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parsed Output</p>
            <Badge variant="success" className="gap-1 text-[10px]">
              <CheckCircle className="h-3 w-3" /> Valid JSON
            </Badge>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Title</p>
              <p className="text-sm font-medium">{result.title}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {result.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Raw JSON</p>
              <pre className="text-xs font-mono bg-muted rounded-md p-3 text-muted-foreground overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
