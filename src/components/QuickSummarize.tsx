'use client'

import { useState, useEffect } from 'react'
import FeedSummaryView from './FeedSummaryView'
import SummarizeQA from './SummarizeQA'

interface HistoryRecord {
  id: string
  url: string
  videoUrl?: string
  title: string
  summary: string
  subtitle?: string
  platform: string
  summarizedAt: string
}

const PLATFORM_BADGE: Record<string, { label: string; color: string }> = {
  bilibili: { label: 'B站', color: 'bg-pink-100 text-pink-700' },
  youtube: { label: 'YouTube', color: 'bg-red-100 text-red-700' },
  xiaohongshu: { label: '小红书', color: 'bg-rose-100 text-rose-700' },
  web: { label: '网页', color: 'bg-gray-100 text-gray-600' },
}

const PLATFORMS = [
  { icon: '📺', label: 'B站', pattern: 'bilibili.com' },
  { icon: '▶️', label: 'YouTube', pattern: 'youtube.com|youtu.be' },
  { icon: '📕', label: '小红书', pattern: 'xiaohongshu.com|xhslink.com' },
  { icon: '🔗', label: '网页', pattern: '' },
]

const XHS_HINTS: { pattern: RegExp; hint: string }[] = [
  { pattern: /xsec_token/i, hint: '' },
  { pattern: /debug Chrome|未运行/, hint: '请先运行 scripts/start-chrome-debug.sh 启动调试浏览器' },
  { pattern: /超时|不存在/, hint: '链接需包含 xsec_token，请从小红书 App「复制链接」获取完整分享链接' },
  { pattern: /\[小红书\]/, hint: '' },
]

function getXhsHint(errMsg: string): string {
  if (errMsg.includes('xiaohongshu.com') || errMsg.includes('xhslink.com') || errMsg.includes('[小红书]')) {
    for (const h of XHS_HINTS) {
      if (h.pattern.test(errMsg) && h.hint) return h.hint
    }
  }
  return ''
}

function detectPlatform(input: string): string {
  if (input.includes('bilibili.com') || input.match(/^BV[a-zA-Z0-9]+$/)) return 'bilibili'
  if (input.includes('youtube.com') || input.includes('youtu.be')) return 'youtube'
  if (input.includes('xiaohongshu.com') || input.includes('xhslink.com')) return 'xiaohongshu'
  return 'web'
}

interface SummarizeResult {
  url: string
  title?: string
  summary?: string
  subtitle?: string
  videoUrl?: string
  error?: string
  status: 'pending' | 'loading' | 'done' | 'error'
  favorited?: boolean
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function QuickSummarize() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<SummarizeResult[]>([])
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  useEffect(() => { fetchHistory() }, [])

  async function fetchHistory() {
    try {
      const res = await fetch('/api/feeds/quick-history')
      if (res.ok) setHistory(await res.json())
    } catch {}
  }

  async function handleDeleteHistory(id: string) {
    await fetch(`/api/feeds/quick-history?id=${id}`, { method: 'DELETE' })
    setHistory(prev => prev.filter(r => r.id !== id))
  }

  function parseUrls(text: string): string[] {
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
  }

  async function summarizeOne(url: string): Promise<Omit<SummarizeResult, 'url' | 'status' | 'favorited'>> {
    const res = await fetch('/api/feeds/quick-summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const data = await res.json()
    if (res.ok && data.summary) {
      return { summary: data.summary, subtitle: data.subtitle, title: data.title, videoUrl: data.videoUrl || url }
    }
    return { error: data.error || '总结失败' }
  }

  async function handleSummarize() {
    const urls = parseUrls(input)
    if (urls.length === 0) return

    setRunning(true)
    // Initialize all as pending
    const initial: SummarizeResult[] = urls.map(url => ({ url, status: 'pending' }))
    setResults(initial)

    // Process sequentially
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      // Mark current as loading
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'loading' } : r))

      try {
        const res = await summarizeOne(url)
        setResults(prev => prev.map((r, idx) =>
          idx === i
            ? { ...r, ...res, status: res.error ? 'error' : 'done', favorited: false }
            : r
        ))
      } catch {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, error: '请求失败，请重试', status: 'error' } : r
        ))
      }
    }

    setRunning(false)
    fetchHistory()
  }

  async function handleFavorite(idx: number) {
    const r = results[idx]
    if (!r.summary) return
    const res = await fetch('/api/feeds/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: r.title || r.url,
        url: r.videoUrl || r.url,
        summary: r.summary,
        subtitle: r.subtitle,
        sourceType: detectPlatform(r.url),
        author: '',
      }),
    })
    if (res.ok || res.status === 409) {
      setResults(prev => prev.map((item, i) => i === idx ? { ...item, favorited: true } : item))
    }
  }

  const urls = parseUrls(input)
  const isBatch = urls.length > 1
  const doneCount = results.filter(r => r.status === 'done').length
  const totalCount = results.length

  return (
    <div className="space-y-4">
      {/* Platform icons */}
      <div className="flex items-center justify-center gap-3">
        {PLATFORMS.map(p => (
          <span key={p.label} className="text-lg" title={p.label}>{p.icon}</span>
        ))}
      </div>

      {/* Input area */}
      <div className="space-y-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={"粘贴链接：每行一个\nB站 / YouTube / 小红书 / 任意网页\n支持批量输入多个链接"}
          rows={isBatch ? Math.min(urls.length + 1, 6) : 3}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-gray-400 resize-none font-mono"
          disabled={running}
        />
        <div className="flex items-center justify-between">
          {urls.length > 0 ? (
            <span className="text-xs text-gray-400">
              {urls.length} 个链接{isBatch ? '（批量模式）' : ''}
            </span>
          ) : (
            <span />
          )}
          <button
            onClick={handleSummarize}
            disabled={running || urls.length === 0}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-2"
          >
            {running ? (
              <><Spinner /> {isBatch ? `总结中 ${doneCount}/${totalCount}` : '总结中'}</>
            ) : isBatch ? `批量总结 (${urls.length})` : '立即总结'}
          </button>
        </div>
      </div>

      {/* Results (current session) */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {r.status === 'loading' && (
                    <Spinner className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  )}
                  {r.status === 'pending' && (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                  {r.status === 'done' && (
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {r.status === 'error' && (
                    <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <a
                    href={r.videoUrl || r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition truncate"
                  >
                    {r.title || r.url}
                  </a>
                </div>
                {r.status === 'done' && (
                  <button
                    onClick={() => handleFavorite(idx)}
                    disabled={r.favorited}
                    className={`shrink-0 px-3 py-1.5 text-xs rounded-full transition flex items-center gap-1 ${
                      r.favorited
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-amber-600 border border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill={r.favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {r.favorited ? '已收藏' : '收藏'}
                  </button>
                )}
              </div>

              {/* Body */}
              {r.status === 'loading' && (
                <div className="px-4 py-3 text-xs text-blue-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  {detectPlatform(r.url) === 'xiaohongshu'
                    ? '正在通过浏览器抓取小红书内容...'
                    : detectPlatform(r.url) === 'web' ? '正在抓取网页内容...' : '正在下载音频并转录...'}
                </div>
              )}
              {r.status === 'pending' && (
                <div className="px-4 py-3 text-xs text-gray-400">等待中...</div>
              )}
              {r.status === 'error' && (
                <div className="px-4 py-3 space-y-2">
                  <div className="text-sm text-red-700 flex items-start gap-2">
                    <span>❌</span>
                    <span className="break-all">{r.error}</span>
                  </div>
                  {r.error && getXhsHint(r.error + r.url) && (
                    <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                      <span>💡</span>
                      <span>{getXhsHint(r.error + r.url)}</span>
                    </div>
                  )}
                </div>
              )}
              {r.status === 'done' && r.summary && (
                <div className="p-4">
                  <FeedSummaryView
                    summary={r.summary}
                    subtitle={r.subtitle}
                    videoUrl={r.videoUrl || r.url}
                    videoTitle={r.title}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* History */}
      {history.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => setHistoryExpanded(v => !v)}
            className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700 transition"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              历史记录 ({history.length})
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${historyExpanded ? '' : '-rotate-90'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {historyExpanded && (
            <div className="mt-3 space-y-2">
              {history.map(record => {
                const badge = PLATFORM_BADGE[record.platform] || PLATFORM_BADGE.web
                const isExpanded = expandedHistoryId === record.id
                return (
                  <div key={record.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <a
                          href={record.videoUrl || record.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition truncate block"
                        >
                          {record.title || record.url}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(record.summarizedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setExpandedHistoryId(isExpanded ? null : record.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 transition"
                        >
                          {isExpanded ? '收起' : '查看'}
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(record.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4">
                        <FeedSummaryView
                          summary={record.summary}
                          subtitle={record.subtitle}
                          videoUrl={record.videoUrl || record.url}
                          videoTitle={record.title}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
