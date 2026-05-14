'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface DistillResult {
  insights: string[]
  todos: string[]
}

interface Props {
  summary?: string
  subtitle?: string
  videoTitle?: string
  videoUrl?: string
  alwaysOpen?: boolean                        // Tab 内嵌模式：跳过折叠按钮，始终展开
  itemId?: string                             // 对应的 feedItem 或 favorite id
  itemType?: 'feedItem' | 'favorite'         // 用于「附到卡片」目标
  onInsightsSaved?: (insights: string[]) => void  // 附到卡片成功后通知父组件更新 UI
}

function generateSuggestions(summary: string): string[] {
  try {
    const data = JSON.parse(summary)
    const questions: string[] = []

    if (data.chapters?.length > 0) {
      const mid = data.chapters[Math.floor(data.chapters.length / 2)]
      if (mid?.title) questions.push(`「${mid.title}」具体讲了什么？`)
      const first = data.chapters[0]
      if (first?.keyPoints?.[0]) questions.push(`能详细解释「${first.keyPoints[0]}」吗？`)
    }

    if (data.takeaway) {
      const short = data.takeaway.slice(0, 20)
      questions.push(`为什么说「${short}${data.takeaway.length > 20 ? '...' : ''}」？`)
    }

    const fallbacks = ['视频最核心的观点是什么？', '有哪些值得实践的建议？', '适合什么人看这个视频？']
    for (const f of fallbacks) {
      if (questions.length >= 3) break
      if (!questions.includes(f)) questions.push(f)
    }

    return questions.slice(0, 3)
  } catch {
    return ['视频最核心的观点是什么？', '有哪些值得实践的建议？', '适合什么人看这个视频？']
  }
}

function Spinner({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function renderAnswer(text: string) {
  const parts = text.split(/(\[\d{1,2}:\d{2}\])/g)
  return parts.map((part, i) =>
    /^\[\d{1,2}:\d{2}\]$/.test(part) ? (
      <span key={i} className="inline-flex items-center mx-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium bg-blue-100 text-blue-700 rounded">
        {part}
      </span>
    ) : <span key={i}>{part}</span>
  )
}

const BASE_DESTINATIONS = [
  { id: 'card',  label: '附到卡片',  icon: '📌', desc: '洞见显示在文章卡片上' },
  { id: 'notes', label: '存为笔记',  icon: '📝', desc: '写入 tech-notes/video-insights/' },
  { id: 'todos', label: '加入待办',  icon: '✅', desc: '行动项存入 Todo 系统' },
  { id: 'rag',   label: '加入知识库', icon: '🧠', desc: '让 AI 助手能检索到' },
]

// 持久化 key：优先用 itemId，fallback 到 videoUrl 的 hash
function getChatStorageKey(itemId?: string, videoUrl?: string): string | null {
  const id = itemId || videoUrl
  if (!id) return null
  return `qa_chat_${id}`
}

function loadMessages(storageKey: string | null): Message[] {
  if (!storageKey) return []
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

function saveMessages(storageKey: string | null, messages: Message[]) {
  if (!storageKey) return
  try {
    if (messages.length === 0) {
      localStorage.removeItem(storageKey)
    } else {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    }
  } catch {}
}

export default function SummarizeQA({ summary, subtitle, videoTitle, videoUrl, alwaysOpen, itemId, itemType, onInsightsSaved }: Props) {
  const storageKey = getChatStorageKey(itemId, videoUrl)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => loadMessages(storageKey))
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)

  // 提炼相关状态
  const [distilling, setDistilling] = useState(false)
  const [distillResult, setDistillResult] = useState<DistillResult | null>(null)
  const [selectedInsights, setSelectedInsights] = useState<Set<number>>(new Set())
  const [selectedTodos, setSelectedTodos] = useState<Set<number>>(new Set())
  const [selectedDests, setSelectedDests] = useState<Set<string>>(new Set(['notes', 'todos', 'rag']))
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<Record<string, { ok: boolean; detail?: string }> | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const suggestions = summary ? generateSuggestions(summary) : []
  const canDistill = messages.length >= 2 && !streaming
  // 只有有 itemId 时才显示「附到卡片」选项
  const DESTINATIONS = itemId ? BASE_DESTINATIONS : BASE_DESTINATIONS.filter(d => d.id !== 'card')

  // 持久化：messages 变化时保存到 localStorage（跳过正在 streaming 的中间状态）
  useEffect(() => {
    if (!streaming && messages.length > 0) {
      saveMessages(storageKey, messages)
    }
  }, [messages, streaming, storageKey])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    const c = scrollContainerRef.current
    if (c) c.scrollTop = c.scrollHeight
  }, [messages])

  async function send(question: string) {
    const q = question.trim()
    if (!q || streaming) return

    const newMessages: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/feeds/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, subtitle, messages: newMessages }),
      })
      if (!res.body) throw new Error('no stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const text = accumulated
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: text }
          return next
        })
      }
    } catch {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: '请求失败，请重试' }
        return next
      })
    } finally {
      setStreaming(false)
    }
  }

  async function handleDistill() {
    setDistilling(true)
    setDistillResult(null)
    setSaveResult(null)
    try {
      const res = await fetch('/api/feeds/distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, messages, videoTitle }),
      })
      const data = await res.json()
      if (res.ok) {
        setDistillResult(data)
        setSelectedInsights(new Set(data.insights.map((_: string, i: number) => i)))
        setSelectedTodos(new Set(data.todos.map((_: string, i: number) => i)))
      }
    } catch {
      setDistillResult({ insights: [], todos: [] })
    } finally {
      setDistilling(false)
    }
  }

  async function handleSave() {
    if (!distillResult) return
    setSaving(true)
    setSaveResult(null)

    const insights = distillResult.insights.filter((_, i) => selectedInsights.has(i))
    const todos = distillResult.todos.filter((_, i) => selectedTodos.has(i))
    const destinations = [...selectedDests]

    try {
      const res = await fetch('/api/feeds/save-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoTitle, videoUrl, insights, todos, destinations, itemId, itemType }),
      })
      const data = await res.json()
      setSaveResult(data.results || {})
      // 附到卡片成功后通知父组件
      if (data.results?.card?.ok && onInsightsSaved) {
        onInsightsSaved(insights)
      }
    } catch {
      setSaveResult({ error: { ok: false, detail: '保存失败' } })
    } finally {
      setSaving(false)
    }
  }

  function toggleDest(id: string) {
    setSelectedDests(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const isOpen = alwaysOpen || open

  return (
    <div className={alwaysOpen ? '' : 'border-t border-gray-100'}>
      {/* Toggle 按钮（alwaysOpen 模式下隐藏） */}
      {!alwaysOpen && (
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            追问
            {messages.length > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-medium">
                {Math.floor(messages.length / 2)}
              </span>
            )}
          </span>
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div className={`space-y-3 ${alwaysOpen ? '' : 'px-4 pb-4'}`}>
          {/* 建议问题 */}
          {messages.length === 0 && suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">建议问题</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q, i) => (
                  <button key={i} onClick={() => send(q)} disabled={streaming}
                    className="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition disabled:opacity-50">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 对话记录 */}
          {messages.length > 0 && (
            <div ref={scrollContainerRef} className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 mt-0.5">
                      AI
                    </div>
                  )}
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {m.role === 'assistant'
                      ? m.content ? renderAnswer(m.content) : <Spinner />
                      : m.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 输入框 */}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="继续追问... (Enter 发送，Shift+Enter 换行)"
              rows={1}
              disabled={streaming}
              className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder:text-gray-400 disabled:opacity-50"
              style={{ minHeight: '38px', maxHeight: '100px' }}
              onInput={e => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 100) + 'px'
              }}
            />
            <button onClick={() => send(input)} disabled={streaming || !input.trim()}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
              {streaming ? <Spinner /> : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* 提炼洞见按钮 */}
          {canDistill && !distillResult && !saveResult && (
            <div className="pt-1">
              <button onClick={handleDistill} disabled={distilling}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 disabled:opacity-50 transition">
                {distilling ? (
                  <><Spinner className="w-3 h-3" /> AI 正在提炼洞见...</>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    提炼洞见
                  </>
                )}
              </button>
            </div>
          )}

          {/* 提炼结果面板 */}
          {distillResult && !saveResult && (
            <div className="border border-purple-200 rounded-xl overflow-hidden bg-purple-50/40">
              <div className="px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span className="text-xs font-semibold text-purple-800">提炼结果</span>
                <span className="text-[10px] text-purple-400 ml-auto">勾选要保存的内容</span>
              </div>

              <div className="px-4 py-3 space-y-4">
                {/* 洞见列表 */}
                {distillResult.insights.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">关键洞见</p>
                    {distillResult.insights.map((insight, i) => (
                      <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedInsights.has(i)}
                          onChange={() => setSelectedInsights(prev => {
                            const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s
                          })}
                          className="mt-0.5 accent-purple-600 shrink-0"
                        />
                        <span className={`text-xs leading-relaxed ${selectedInsights.has(i) ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          {insight}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* 行动项列表 */}
                {distillResult.todos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">行动项</p>
                    {distillResult.todos.map((todo, i) => (
                      <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedTodos.has(i)}
                          onChange={() => setSelectedTodos(prev => {
                            const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s
                          })}
                          className="mt-0.5 accent-purple-600 shrink-0"
                        />
                        <span className={`text-xs leading-relaxed ${selectedTodos.has(i) ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          {todo}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* 保存目标 */}
                <div className="space-y-2 pt-1 border-t border-purple-100">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">保存到</p>
                  <div className="flex flex-wrap gap-2">
                    {DESTINATIONS.map(dest => (
                      <button
                        key={dest.id}
                        onClick={() => toggleDest(dest.id)}
                        title={dest.desc}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition ${
                          selectedDests.has(dest.id)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <span>{dest.icon}</span>
                        {dest.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 保存按钮 */}
                <button
                  onClick={handleSave}
                  disabled={saving || selectedDests.size === 0 || (selectedInsights.size === 0 && selectedTodos.size === 0)}
                  className="w-full py-2 text-xs font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {saving ? <><Spinner className="w-3 h-3" /> 保存中...</> : '保存'}
                </button>
              </div>
            </div>
          )}

          {/* 保存结果 */}
          {saveResult && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 space-y-2">
                {Object.entries(saveResult).map(([key, val]) => {
                  const dest = BASE_DESTINATIONS.find(d => d.id === key)
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span>{val.ok ? '✅' : '❌'}</span>
                      <span className="font-medium text-gray-700">{dest?.label || key}</span>
                      {val.detail && <span className="text-gray-400">{val.detail}</span>}
                    </div>
                  )
                })}
                <button
                  onClick={() => { setDistillResult(null); setSaveResult(null) }}
                  className="mt-1 text-[10px] text-gray-400 hover:text-gray-600 transition"
                >
                  继续追问 →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
