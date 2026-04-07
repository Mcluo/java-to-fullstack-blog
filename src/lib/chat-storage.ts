import { supabase } from './supabase'

export interface ChatSession {
  id: string
  title: string
  preview: string
  createdAt: string
  messageCount: number
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  contexts?: { type: string; label: string }[]
}

const SESSIONS_KEY = 'ai_chat_sessions'
const STORAGE_KEY = 'ai_chat_history'
const MAX_SESSIONS = 50
const SYNCED_FLAG = 'ai_chat_synced'

// --- localStorage helpers (unchanged logic, extracted) ---

function localGetSessions(): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') } catch { return [] }
}

function localSaveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

function localGetMessages(id: string): Message[] {
  try { return JSON.parse(localStorage.getItem(`ai_session_${id}`) || '[]') } catch { return [] }
}

function localSaveMessages(id: string, messages: Message[]) {
  localStorage.setItem(`ai_session_${id}`, JSON.stringify(messages))
}

function localDeleteSession(id: string) {
  localStorage.removeItem(`ai_session_${id}`)
}

// --- Supabase helpers ---

async function supaGetSessions(githubId: string): Promise<ChatSession[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_github_id', githubId)
    .order('updated_at', { ascending: false })
    .limit(MAX_SESSIONS)
  if (!data) return []
  return data.map((s: any) => ({
    id: s.id,
    title: s.title,
    preview: s.preview || '',
    createdAt: s.created_at,
    messageCount: 0, // will be enriched if needed
  }))
}

async function supaGetMessages(sessionId: string): Promise<Message[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('chat_messages')
    .select('role, content, contexts')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (!data) return []
  return data.map((m: any) => ({
    role: m.role,
    content: m.content,
    ...(m.contexts ? { contexts: m.contexts } : {}),
  }))
}

async function supaSaveSession(githubId: string, session: ChatSession) {
  if (!supabase) return
  await supabase.from('chat_sessions').upsert({
    id: session.id,
    user_github_id: githubId,
    title: session.title,
    preview: session.preview,
    created_at: session.createdAt,
    updated_at: new Date().toISOString(),
  })
}

async function supaSaveMessages(sessionId: string, messages: Message[]) {
  if (!supabase) return
  // Delete old messages, insert fresh (simpler than diffing)
  await supabase.from('chat_messages').delete().eq('session_id', sessionId)
  if (messages.length === 0) return
  const rows = messages.map(m => ({
    session_id: sessionId,
    role: m.role,
    content: m.content,
    contexts: m.contexts || null,
  }))
  await supabase.from('chat_messages').insert(rows)
}

async function supaDeleteSession(sessionId: string) {
  if (!supabase) return
  // cascade deletes messages
  await supabase.from('chat_sessions').delete().eq('id', sessionId)
}

// --- Public API ---

export function isLoggedIn(githubId: string | undefined): githubId is string {
  return !!githubId && !!supabase
}

export async function getSessions(githubId?: string): Promise<ChatSession[]> {
  if (isLoggedIn(githubId)) {
    return supaGetSessions(githubId)
  }
  return localGetSessions()
}

export async function getMessages(sessionId: string, githubId?: string): Promise<Message[]> {
  if (isLoggedIn(githubId)) {
    return supaGetMessages(sessionId)
  }
  return localGetMessages(sessionId)
}

export async function saveSession(session: ChatSession, githubId?: string) {
  if (isLoggedIn(githubId)) {
    await supaSaveSession(githubId, session)
    return
  }
  const sessions = localGetSessions()
  const updated = [session, ...sessions.filter(s => s.id !== session.id)].slice(0, MAX_SESSIONS)
  localSaveSessions(updated)
}

export async function saveMessages(sessionId: string, messages: Message[], githubId?: string) {
  if (isLoggedIn(githubId)) {
    await supaSaveMessages(sessionId, messages)
    return
  }
  localSaveMessages(sessionId, messages)
}

export async function deleteSession(sessionId: string, githubId?: string) {
  if (isLoggedIn(githubId)) {
    await supaDeleteSession(sessionId)
    return
  }
  const sessions = localGetSessions().filter(s => s.id !== sessionId)
  localSaveSessions(sessions)
  localDeleteSession(sessionId)
}

export async function clearAllSessions(githubId?: string) {
  if (isLoggedIn(githubId)) {
    if (!supabase) return
    // Delete all sessions for this user (cascade deletes messages)
    await supabase.from('chat_sessions').delete().eq('user_github_id', githubId)
    return
  }
  const sessions = localGetSessions()
  sessions.forEach(s => localDeleteSession(s.id))
  localSaveSessions([])
}

/**
 * Migrate localStorage sessions to Supabase on first login.
 * Only runs once per user (tracked by SYNCED_FLAG).
 */
export async function syncFromLocal(githubId: string): Promise<number> {
  if (!supabase) return 0
  const flag = `${SYNCED_FLAG}_${githubId}`
  if (localStorage.getItem(flag)) return 0

  const localSessions = localGetSessions()
  if (localSessions.length === 0) {
    localStorage.setItem(flag, '1')
    return 0
  }

  let migrated = 0
  for (const session of localSessions) {
    const msgs = localGetMessages(session.id)
    if (msgs.length === 0) continue
    await supaSaveSession(githubId, session)
    await supaSaveMessages(session.id, msgs)
    migrated++
  }

  // Clean up localStorage after migration
  localSessions.forEach(s => localDeleteSession(s.id))
  localSaveSessions([])
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('ai_active_session')
  localStorage.setItem(flag, '1')

  return migrated
}
