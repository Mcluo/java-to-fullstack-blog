'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  articleTitle: string
  articleContent: string
  articleSlug: string
}

function generateSuggestedQuestions(content: string, title: string): string[] {
  const headings = content.match(/^##\s+.+$/gm) || []
  const questions: string[] = []

  // 基于标题生成核心问题
  questions.push(`这篇文章的核心观点是什么？`)

  // 基于H2标题生成章节问题
  if (headings.length > 2) {
    const mid = headings[Math.floor(headings.length / 2)].replace(/^##\s+/, '')
    questions.push(`「${mid}」这部分具体讲了什么？`)
  }

  if (headings.length > 0) {
    const last = headings[headings.length - 1].replace(/^##\s+/, '')
    questions.push(`「${last}」有哪些关键结论？`)
  }

  // 补充通用问题
  const fallbacks = [
    '用一句话总结这篇文章',
    '这篇文章有哪些值得实践的建议？',
    '读完这篇文章我应该记住什么？',
  ]
  for (const f of fallbacks) {
    if (questions.length >= 4) break
    if (!questions.includes(f)) questions.push(f)
  }

  return questions.slice(0, 4)
}

export default function ArticleReadingAssistant({ articleTitle, articleContent, articleSlug }: Props) {
  const storageKey = `article_qa_${articleSlug}`
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const suggestions = generateSuggestedQuestions(articleContent, articleTitle)

  // 加载历史消息
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setMessages(parsed)
      }
    } catch {}
  }, [storageKey])

  // 保存消息
  useEffect(() => {
    if (!streaming && messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch {}
    }
  }, [messages, streaming, storageKey])

  // 滚动到底部
  useEffect(() => {
    const c = scrollRef.current
    if (c) c.scrollTop = c.scrollHeight
  }, [messages])

  // 截取文章内容（控制token：取前6000字符 ≈ 3000-4000 tokens）
  function getArticleContext(): string {
    const maxLen = 6000
    if (articleContent.length <= maxLen) return articleContent
    return articleContent.slice(0, maxLen) + '\n\n[... 文章内容已截断 ...]'
  }

  async function send(question: string) {
    const q = question.trim()
    if (!q || streaming) return

    const newMessages: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          history: newMessages.slice(-6), // 保留最近3轮对话
          contexts: [{
            type: 'text',
            label: `当前文章：${articleTitle}`,
            content: getArticleContext(),
          }],
        }),
      })

      if (!res.body) throw new Error('no stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        // 解析SSE格式
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'text') {
                accumulated += data.content
                setMessages(prev => {
                  const next = [...prev]
                  next[next.length - 1] = { role: 'assistant', content: accumulated }
                  return next
                })
              }
            } catch {}
          }
        }
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

  async function handleSummarize() {
    setSummarizing(true)
    setSummary(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '请用结构化的方式总结这篇文章的核心要点：1) 一句话总结 2) 3-5个核心观点 3) 关键结论。简洁精炼，不要废话。',
          history: [],
          contexts: [{
            type: 'text',
            label: `当前文章：${articleTitle}`,
            content: getArticleContext(),
          }],
        }),
      })

      if (!res.body) throw new Error('no stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'text') {
                accumulated += data.content
                setSummary(accumulated)
              }
            } catch {}
          }
        }
      }
    } catch {
      setSummary('总结生成失败，请重试')
    } finally {
      setSummarizing(false)
    }
  }

  function clearHistory() {
    setMessages([])
    setSummary(null)
    localStorage.removeItem(storageKey)
  }

  if (!open) {
    return (
      <div className="my-8 border border-blue-100 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">AI 精读助手</h3>
              <p className="text-xs text-gray-500">对文章提问、一键总结、深度理解</p>
            </div>
          </div>
          <button
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100) }}
            className="px-3.5 py-1.5 text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition"
          >
            开始精读
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="my-8 border border-blue-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">AI 精读助手</span>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1">
              清空
            </button>
          )}
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 一键总结区 */}
      {!summary && messages.length === 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50"
          >
            {summarizing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                正在总结...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                一键总结全文
              </>
            )}
          </button>
        </div>
      )}

      {/* 总结结果 */}
      {summary && (
        <div className="px-4 py-3 border-b border-gray-100 bg-indigo-50/30">
          <div className="text-xs font-medium text-indigo-600 mb-1.5">全文总结</div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</div>
        </div>
      )}

      {/* 对话区 */}
      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-80 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content || (streaming && i === messages.length - 1 ? '...' : '')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 推荐问题 */}
      {messages.length === 0 && (
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="text-xs text-gray-400 mb-2">试试问这些：</div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                disabled={streaming}
                className="text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-100 hover:border-blue-200 transition disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="对这篇文章有什么疑问？"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 placeholder:text-gray-400"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
