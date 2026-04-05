import { useState, useMemo } from 'react'
import { Check, Copy, RefreshCw, Bot, User } from 'lucide-react'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import 'highlight.js/styles/github-dark.css'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

// Register only the languages we need (keeps bundle small)
hljs.registerLanguage('python', python)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('py', python)
hljs.registerLanguage('sh', bash)

// Configure marked with syntax highlighting
marked.setOptions({ gfm: true, breaks: true })
const renderer = new marked.Renderer()
renderer.code = ({ text, lang }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : undefined
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value
  return `<pre><code class="hljs language-${language ?? 'plaintext'}">${highlighted}</code></pre>`
}
marked.use({ renderer })

interface MessageBubbleProps {
  message: Message
  isLast: boolean
  isStreaming: boolean
  onRegenerate?: () => void
}

export function MessageBubble({ message, isLast, isStreaming, onRegenerate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const html = useMemo(() => {
    if (isUser) return null
    const raw = marked.parse(message.content) as string
    return DOMPurify.sanitize(raw)
  }, [message.content, isUser])

  const copy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs',
        isUser
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted text-muted-foreground border-border',
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1 max-w-[75%]', isUser && 'items-end')}>
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-card border border-border rounded-tl-sm',
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          ) : message.isStreaming && !message.content ? (
            /* Blinking cursor while waiting for first token */
            <span className="inline-block w-2 h-4 bg-muted-foreground rounded-sm animate-pulse" />
          ) : (
            <div
              className="prose-chat"
              dangerouslySetInnerHTML={{ __html: html ?? '' }}
            />
          )}
        </div>

        {/* Actions: copy + regenerate */}
        {!isUser && !message.isStreaming && (
          <div className={cn(
            'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
          )}>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copy}>
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
            {isLast && !isStreaming && onRegenerate && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRegenerate}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
