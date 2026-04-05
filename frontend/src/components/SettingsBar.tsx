import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fetchModels, fetchHealth } from '@/lib/api'
import { Separator } from '@/components/ui/separator'

interface SettingsBarProps {
  model: string
  temperature: number
  onModelChange: (m: string) => void
  onTemperatureChange: (t: number) => void
}

export function SettingsBar({ model, temperature, onModelChange, onTemperatureChange }: SettingsBarProps) {
  const [models, setModels] = useState<string[]>(['llama3.2', 'mistral:7b', 'phi4'])
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    fetchModels().then(setModels).catch(() => {})
  }, [])

  useEffect(() => {
    const check = () =>
      fetchHealth()
        .then((h) => setOnline(h.ollama))
        .catch(() => setOnline(false))
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-3 px-4 h-12 border-b border-border bg-background shrink-0">
      {/* Ollama status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            {online === null ? (
              <Badge variant="secondary" className="gap-1"><Wifi className="h-3 w-3" />Checking…</Badge>
            ) : online ? (
              <Badge variant="success" className="gap-1"><Wifi className="h-3 w-3" />Ollama Online</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1"><WifiOff className="h-3 w-3" />Ollama Offline</Badge>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>Ollama server status (checked every 30s)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5" />

      {/* Model selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Model</span>
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Temperature */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Temp</span>
        <Slider
          min={0} max={1} step={0.1}
          value={[temperature]}
          onValueChange={([v]) => onTemperatureChange(v)}
          className="w-20"
        />
        <span className="text-xs font-mono text-muted-foreground w-6">{temperature.toFixed(1)}</span>
      </div>

    </div>
  )
}
