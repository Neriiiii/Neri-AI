import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { runBenchmark } from '@/lib/api'
import type { BenchmarkResult } from '@/types'

interface BenchmarkPanelProps {
  model: string
  temperature: number
}

export function BenchmarkPanel({ model, temperature }: BenchmarkPanelProps) {
  const [limit, setLimit] = useState(5)
  const [trials, setTrials] = useState(3)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true)
    setError('')
    setResults([])
    try {
      const rows = await runBenchmark({ model, limit, trials, temperature })
      setResults(rows)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const avg = (key: keyof BenchmarkResult) =>
    results.length
      ? (results.reduce((s, r) => s + (r[key] as number), 0) / results.length).toFixed(2)
      : '—'

  return (
    <div className="p-5 space-y-4">
      {/* Run controls */}
      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Prompt Limit</label>
          <Input type="number" className="h-8 text-xs w-24" value={limit} min={1} max={26}
            onChange={(e) => setLimit(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Trials / Prompt</label>
          <Input type="number" className="h-8 text-xs w-24" value={trials} min={1} max={10}
            onChange={(e) => setTrials(Number(e.target.value))} />
        </div>
        <div className="flex-1" />
        <Button size="sm" className="gap-2 self-end" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {loading ? `Running ${limit} × ${trials}…` : 'Run Benchmark'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Results table */}
      {results.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Results — {model}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Prompt</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">TPS</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">TTFT</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">Latency</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground max-w-[280px] truncate" title={r.prompt_preview}>
                      {r.prompt_preview}…
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Badge variant="success" className="text-[10px]">{r.tokens_per_second}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{r.time_to_first_token_ms} ms</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{r.total_latency_ms} ms</td>
                  </tr>
                ))}
                <tr className="bg-primary/5 font-semibold">
                  <td className="px-4 py-2 text-primary">Average ({results.length} prompts)</td>
                  <td className="px-4 py-2 text-right text-primary">{avg('tokens_per_second')} TPS</td>
                  <td className="px-4 py-2 text-right text-primary">{avg('time_to_first_token_ms')} ms</td>
                  <td className="px-4 py-2 text-right text-primary">{avg('total_latency_ms')} ms</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground px-4 py-2">
            Saved to <code className="font-mono">results/</code> as JSON + CSV
          </p>
        </div>
      )}
    </div>
  )
}
