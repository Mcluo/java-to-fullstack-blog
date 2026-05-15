'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

interface HnDailyItem {
  id: number
  title: string
  body: string
  date: string
  url: string
  fetchedAt: string
}

// Parse structured sections from markdown body
function parseSections(body: string) {
  // Remove duplicate header block (first h1 + meta line + hr)
  const cleaned = body
    .replace(/^#\s+Hacker News AI.*?\n+>.*?\n+---\n*/s, '')
    .replace(/^#\s+Hacker News AI.*?\n+\*\*日期.*?\n+---\n*/s, '')
    .trim()

  const sections: { type: string; title: string; icon: string; content: string }[] = []
  const parts = cleaned.split(/\n(?=## )/)

  for (const part of parts) {
    const match = part.match(/^## (.+)\n([\s\S]*)/)
    if (!match) continue
    const [, title, content] = match

    let type = 'default'
    let icon = '📄'
    if (title.includes('今日速览')) { type = 'overview'; icon = '⚡' }
    else if (title.includes('热门新闻')) { type = 'news'; icon = '🔥' }
    else if (title.includes('社区情绪')) { type = 'sentiment'; icon = '📊' }
    else if (title.includes('值得深读')) { type = 'deepread'; icon = '📖' }

    sections.push({ type, title: title.trim(), icon, content: content.trim() })
  }

  return sections
}

// Extract top stories with scores from the news section
function extractTopStories(content: string) {
  const stories: { title: string; score: number; comments: number; reason: string }[] = []
  const blocks = content.split(/\n(?=\*\*\d+\.)/)

  for (const block of blocks) {
    const titleMatch = block.match(/\*\*\d+\.\s+(.+?)\*\*/)
    const scoreMatch = block.match(/分数[：:]\s*(\d+)/)
    const commentMatch = block.match(/评论[：:]\s*(\d+)/)
    const reasonMatch = block.match(/>\s*\*\*关注理由\*\*[：:]\s*([\s\S]*?)(?=\n\n|\n\*\*|$)/)

    if (titleMatch) {
      stories.push({
        title: titleMatch[1],
        score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
        comments: commentMatch ? parseInt(commentMatch[1]) : 0,
        reason: reasonMatch ? reasonMatch[1].trim() : '',
      })
    }
  }

  return stories.sort((a, b) => b.score - a.score)
}

// Format relative date
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff < 7) return `${diff} 天前`
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}月${day}日`
}

function weekday(dateStr: string) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[new Date(dateStr).getDay()]
}

// ── Section renderers ──────────────────────────────

function OverviewCard({ content }: { content: string }) {
  return (
    <div className="relative p-5 rounded-xl bg-gradient-to-br from-orange-50 via-amber-50/50 to-yellow-50/30 border border-orange-100/60">
      <div className="text-[13px] leading-relaxed text-gray-700">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="text-gray-900 font-semibold">{children}</strong>,
          }}
        >
          {content.replace(/---\s*$/, '').trim()}
        </ReactMarkdown>
      </div>
    </div>
  )
}

function TopStoriesBar({ stories }: { stories: ReturnType<typeof extractTopStories> }) {
  const top3 = stories.slice(0, 3)
  if (top3.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {top3.map((s, i) => (
        <div
          key={i}
          className="flex-1 min-w-0 p-3 rounded-xl bg-white border border-gray-100 hover:border-orange-200 transition"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white ${
              i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-amber-500' : 'bg-yellow-500'
            }`}>
              {i + 1}
            </span>
            <span className="text-xs text-gray-400 tabular-nums">{s.score} pts</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400 tabular-nums">{s.comments} 评论</span>
          </div>
          <p className="text-[13px] font-medium text-gray-800 line-clamp-2 leading-snug">
            {s.title}
          </p>
        </div>
      ))}
    </div>
  )
}

function NewsSection({ content }: { content: string }) {
  // Split by category headers (### 🔬 / 🛠️ / 🏢 / 💬)
  const categories = content.split(/\n(?=### )/).filter(c => c.startsWith('### '))

  return (
    <div className="space-y-4">
      {categories.map((cat, ci) => {
        const headerMatch = cat.match(/^### (.+)\n([\s\S]*)/)
        if (!headerMatch) return null
        const [, header, body] = headerMatch

        return (
          <div key={ci}>
            <h4 className="text-sm font-semibold text-gray-500 mb-2.5 flex items-center gap-1.5">
              {header}
            </h4>
            <div className="space-y-2.5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => {
                    const text = String(children)
                    // Render "关注理由" blockquotes as styled cards
                    if (text.includes('关注理由')) {
                      return (
                        <div className="ml-3 pl-3 border-l-2 border-orange-200 text-[12px] text-gray-500 leading-relaxed mb-3">
                          {children}
                        </div>
                      )
                    }
                    return <p className="text-[13px] text-gray-700 mb-1 leading-relaxed">{children}</p>
                  },
                  strong: ({ children }) => {
                    const text = String(children)
                    // Number titles like "1. xxx"
                    if (/^\d+\./.test(text)) {
                      return <strong className="text-[13px] font-semibold text-gray-900 block mt-3 first:mt-0">{children}</strong>
                    }
                    if (text === '关注理由') {
                      return <strong className="text-orange-500 font-medium">{children}</strong>
                    }
                    return <strong className="font-semibold text-gray-800">{children}</strong>
                  },
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 hover:underline">{children}</a>
                  ),
                  ul: ({ children }) => <ul className="text-[13px] text-gray-600 space-y-0.5 ml-3 mb-1">{children}</ul>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  blockquote: ({ children }) => (
                    <div className="ml-3 pl-3 border-l-2 border-orange-200 text-[12px] text-gray-500 leading-relaxed mb-3">
                      {children}
                    </div>
                  ),
                  hr: () => <div className="my-3" />,
                }}
              >
                {body.replace(/---\s*$/, '').trim()}
              </ReactMarkdown>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SentimentCard({ content }: { content: string }) {
  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-100/50">
      <div className="text-[13px] leading-relaxed text-gray-700">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="text-gray-900 font-semibold">{children}</strong>,
          }}
        >
          {content.replace(/---\s*$/, '').trim()}
        </ReactMarkdown>
      </div>
    </div>
  )
}

function DeepReadCard({ content }: { content: string }) {
  // Parse numbered items
  const items = content.split(/\n(?=\*\*\d+\.)/).filter(Boolean)

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const titleMatch = item.match(/\*\*\d+\.\s*\[(.+?)\]\((.+?)\)\*\*/)
        const reasonMatch = item.match(/>\s*\*\*理由\*\*[：:]\s*([\s\S]*?)(?=\n\n|$)/)

        if (!titleMatch) return (
          <div key={i} className="text-[13px] text-gray-600 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.replace(/---\s*$/, '').trim()}</ReactMarkdown>
          </div>
        )

        return (
          <a
            key={i}
            href={titleMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-xl bg-white border border-gray-100 hover:border-orange-200 hover:shadow-sm transition group"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-orange-50 text-orange-500 text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-gray-900 group-hover:text-orange-600 transition line-clamp-2 leading-snug">
                  {titleMatch[1]}
                </p>
                {reasonMatch && (
                  <p className="text-[12px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {reasonMatch[1].trim()}
                  </p>
                )}
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────

export default function HnDailyPage() {
  const [items, setItems] = useState<HnDailyItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [error, setError] = useState('')

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch('/api/feeds/hn-daily?limit=50')
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  const handleFetch = async () => {
    setFetching(true)
    setError('')
    try {
      const res = await fetch('/api/feeds/hn-daily', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // POST now returns merged items directly
      if (data.items) {
        setItems(data.items)
        setTotal(data.total || data.items.length)
      } else {
        await loadItems()
      }
    } catch (err: any) {
      setError(err.message || '拉取失败')
    } finally {
      setFetching(false)
    }
  }

  const current = items[selectedIdx]
  const sections = useMemo(() => current ? parseSections(current.body) : [], [current])
  const topStories = useMemo(() => {
    const newsSection = sections.find(s => s.type === 'news')
    return newsSection ? extractTopStories(newsSection.content) : []
  }, [sections])

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-lg w-64" />
          <div className="h-4 bg-gray-100 rounded w-40" />
          <div className="h-48 bg-gray-50 rounded-2xl" />
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 mb-3 text-sm">
          <Link href="/feeds" className="text-gray-400 hover:text-gray-600 transition">
            订阅中心
          </Link>
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-600 font-medium">HN AI 日报</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm shadow-orange-200/50">
              <span className="text-white text-sm font-bold tracking-tight">HN</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Hacker News AI 日报</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                borq168/big_model_radar · {total} 期
              </p>
            </div>
          </div>
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition flex items-center gap-1.5"
          >
            {fetching ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {fetching ? '拉取中' : '同步'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-24 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">📰</span>
          </div>
          <p className="text-gray-500 mb-4 text-sm">暂无日报数据</p>
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="px-5 py-2.5 text-sm font-medium rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition shadow-sm"
          >
            {fetching ? '拉取中...' : '立即拉取'}
          </button>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Left: Date timeline */}
          <div className="w-36 shrink-0 hidden sm:block">
            <div className="sticky top-20 space-y-0.5 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
              {items.map((item, idx) => {
                const isActive = idx === selectedIdx
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedIdx(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition text-[13px] ${
                      isActive
                        ? 'bg-orange-50 text-orange-700 font-medium'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    <div className="tabular-nums">{item.date}</div>
                    <div className="text-[11px] opacity-60">{weekday(item.date)} · {formatDate(item.date)}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mobile date selector */}
          <div className="sm:hidden mb-4 w-full">
            <select
              value={selectedIdx}
              onChange={e => setSelectedIdx(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-700"
            >
              {items.map((item, idx) => (
                <option key={item.id} value={idx}>
                  {item.date} ({weekday(item.date)})
                </option>
              ))}
            </select>
          </div>

          {/* Right: Content area */}
          {current && (
            <div className="flex-1 min-w-0 space-y-5">
              {/* Date header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-900">{current.date}</h2>
                  <span className="text-xs text-gray-400">{weekday(current.date)}</span>
                </div>
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-orange-500 transition flex items-center gap-1"
                >
                  <span>#{current.id}</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Top 3 stories bar */}
              {topStories.length > 0 && <TopStoriesBar stories={topStories} />}

              {/* Sections */}
              {sections.map((section, si) => (
                <section key={si} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                    <span className="text-base">{section.icon}</span>
                    <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                  </div>
                  <div className="px-5 py-4">
                    {section.type === 'overview' && <OverviewCard content={section.content} />}
                    {section.type === 'news' && <NewsSection content={section.content} />}
                    {section.type === 'sentiment' && <SentimentCard content={section.content} />}
                    {section.type === 'deepread' && <DeepReadCard content={section.content} />}
                    {section.type === 'default' && (
                      <div className="text-[13px] text-gray-700 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </section>
              ))}

              {/* Footer */}
              <p className="text-center text-[11px] text-gray-400 py-2">
                数据由 <a href="https://github.com/borq168/big_model_radar" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition">Big Model Radar</a> 自动生成
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
