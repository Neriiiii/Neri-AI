import { useState, useCallback } from 'react'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/Sidebar'
import { SettingsBar } from '@/components/SettingsBar'
import { ChatPanel } from '@/components/ChatPanel'
import { SettingsPage } from '@/components/SettingsPage'
import { LoginPage } from '@/components/LoginPage'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import {
  loadConversations,
  createConversation,
  deleteConversation,
} from '@/lib/conversations'
import type { Conversation } from '@/types'

type Nav = 'chat' | 'settings'

function Inner() {
  const { isAuthenticated, logout } = useAuth()

  const [model, setModel] = useState('llama3.2')
  const [temperature, setTemperature] = useState(0.7)
  const [nav, setNav] = useState<Nav>('chat')

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const existing = loadConversations()
    if (existing.length > 0) return existing
    const fresh = createConversation('llama3.2')
    return [fresh]
  })

  const [activeId, setActiveId] = useState<string>(() => {
    const existing = loadConversations()
    if (existing.length > 0) return existing[0].id
    return conversations[0]?.id ?? ''
  })

  const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0]

  const refresh = useCallback(() => {
    setConversations(loadConversations())
  }, [])

  const handleNew = useCallback(() => {
    const conv = createConversation(model)
    refresh()
    setActiveId(conv.id)
    setNav('chat')
  }, [model, refresh])

  const handleSelect = useCallback((id: string) => {
    setActiveId(id)
    setNav('chat')
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      deleteConversation(id)
      const remaining = loadConversations()
      if (remaining.length === 0) {
        const fresh = createConversation(model)
        setConversations([fresh])
        setActiveId(fresh.id)
      } else {
        setConversations(remaining)
        if (id === activeId) setActiveId(remaining[0].id)
      }
    },
    [activeId, model],
  )

  const handleConversationUpdate = useCallback((_conv: Conversation) => {
    refresh()
  }, [refresh])

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        nav={nav}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        onNavChange={setNav}
        onLogout={logout}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Settings bar */}
        <SettingsBar
          model={model}
          temperature={temperature}
          onModelChange={setModel}
          onTemperatureChange={setTemperature}
        />

        {/* Panel */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {nav === 'settings' ? (
            <SettingsPage />
          ) : (
            activeConversation && (
              <ChatPanel
                key={activeId}
                conversation={activeConversation}
                model={model}
                temperature={temperature}
                onConversationUpdate={handleConversationUpdate}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider delayDuration={300}>
        <AuthProvider>
          <Inner />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
