import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

const STORAGE_KEY = 'local_ai_auth'
const SESSION_KEY = 'local_ai_auth_session'

// PBKDF2-SHA256 with 100k iterations — much stronger than plain SHA-256.
// v=2 marks hashes produced by this function; v absent = legacy SHA-256 hash.
async function pbkdf2Hash(password: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('local-ai-assistant-v2'), iterations: 100_000 },
    keyMaterial,
    256,
  )
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Legacy SHA-256 — used only during migration of old stored hashes.
async function sha256(text: string): Promise<string> {
  const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface StoredCredentials {
  username: string
  passwordHash: string
  v?: number  // 2 = PBKDF2, absent = legacy SHA-256
}

function loadCredentials(): StoredCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredCredentials
  } catch {
    return null
  }
}

function saveCredentials(username: string, hash: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, passwordHash: hash, v: 2 }))
}

interface AuthContextValue {
  isAuthenticated: boolean
  hasCredentials: boolean
  username: string
  login: (password: string) => Promise<boolean>
  logout: () => void
  setup: (username: string, password: string) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  changeUsername: (newUsername: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1',
  )
  const [hasCredentials, setHasCredentials] = useState(() => loadCredentials() !== null)
  const [username, setUsername] = useState(() => loadCredentials()?.username ?? '')

  // Brute-force protection: track failed attempts and lock-out timestamp.
  const failedAttempts = useRef(0)
  const lockedUntil = useRef(0)

  const login = useCallback(async (password: string): Promise<boolean> => {
    // Lock-out check: after 5 failures, add exponential delay (max ~32s).
    if (Date.now() < lockedUntil.current) return false

    const creds = loadCredentials()
    if (!creds) return false

    // Support both PBKDF2 (v=2) and legacy SHA-256 (no v field).
    const hash = creds.v === 2 ? await pbkdf2Hash(password) : await sha256(password)

    if (hash === creds.passwordHash) {
      // Migrate legacy SHA-256 hash to PBKDF2 on first successful login.
      if (creds.v !== 2) {
        saveCredentials(creds.username, await pbkdf2Hash(password))
      }
      failedAttempts.current = 0
      sessionStorage.setItem(SESSION_KEY, '1')
      setIsAuthenticated(true)
      setUsername(creds.username)
      return true
    }

    failedAttempts.current += 1
    if (failedAttempts.current >= 5) {
      // Exponential back-off: 2^(attempts-4) seconds, capped at 32s.
      const delayMs = Math.min(2 ** (failedAttempts.current - 4), 32) * 1000
      lockedUntil.current = Date.now() + delayMs
    }
    return false
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)
  }, [])

  const setup = useCallback(async (uname: string, password: string): Promise<void> => {
    const hash = await pbkdf2Hash(password)
    saveCredentials(uname, hash)
    sessionStorage.setItem(SESSION_KEY, '1')
    setHasCredentials(true)
    setUsername(uname)
    setIsAuthenticated(true)
  }, [])

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<boolean> => {
      const creds = loadCredentials()
      if (!creds) return false
      const oldHash = creds.v === 2 ? await pbkdf2Hash(oldPassword) : await sha256(oldPassword)
      if (oldHash !== creds.passwordHash) return false
      saveCredentials(creds.username, await pbkdf2Hash(newPassword))
      return true
    },
    [],
  )

  const changeUsername = useCallback((newUsername: string) => {
    const creds = loadCredentials()
    if (!creds) return
    saveCredentials(newUsername, creds.passwordHash)
    setUsername(newUsername)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, hasCredentials, username, login, logout, setup, changePassword, changeUsername }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
