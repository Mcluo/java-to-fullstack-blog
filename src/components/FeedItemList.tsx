'use client'

import { useState, useEffect } from 'react'
import FeedSummaryView from './FeedSummaryView'

interface FeedItemData {
  id: string
  sourceId: string
  sourceName: string
  title: string
  url: string
  thumbnail?: string
  duration?: string
  author: string
  publishedAt: string
  subtitle?: string
  summary?: string
  fetchedAt: string
  sourceType: 'rss' | 'bilibili' | 'youtube'
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  bilibili: { label: 'B站', color: 'bg-pink-100 text-pink-700' },
  youtube: { label: 'YouTube', color: 'bg-red-100 text-red-700' },
  rss: { label: 'RSS', color: 'bg-green-100 text-green-700' },
}

function Spinner({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function FeedItemList() {
  const [items, setItems] = useState<FeedItemData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchResult, setFetchResult] = useState<string | null>(null)
  const [summarizingIds, setSummarizingIds] = useState<Set<string>>(new Set())
  const [batchSummarizing, setBatchSummarizing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { fetchItems() }, [filter])

  async function fetchItems() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filter !== 'all') params.set('sourceType', filter)
      const res = await fetch(`/api/feeds/items?${params}`)
      const data = await res.json()
      setItems(data.items)
      setTotal(data.total)
    } catch {} finally { setLoading(false) }
  }

  async function handleFetch() {
    setFetching(true)
    setFetchResult(null)
    try {
      const res = await fetch('/api/feeds/fetch', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setFetchResult(`拉取完成: 新增 ${data.newItems} 条，总计 ${data.totalItems} 条`)
        await fetchItems()
      } else {
        setFetchResult(`拉取失败: ${data.error}`)
      }
    } catch { setFetchResult('网络错误') }
    finally {
      setFetching(false)
      setTimeout(() => setFetchResult(null), 5000)
    }
  }

  async function handleSummarize(itemId: string) {
    setSummarizingIds(prev => new Set(prev).add(itemId))
    try {
      const res = await fetch('/api/feeds/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      const data = await res.json()
      if (res.ok && data.results?.[0]?.summary) {
        setItems(prev => prev.map(i =>
          i.id === itemId ? { ...i, summary: data.results[0].summary } : i
        ))
        setExpandedSummary(itemId)
      } else {
        const err = data.results?.[0]?.error || data.error || '总结失败'
        setFetchResult(`总结失败: ${err}`)
        setTimeout(() => setFetchResult(null), 5000)
      }
    } catch {
      setFetchResult('总结请求失败')
      setTimeout(() => setFetchResult(null), 5000)
    } finally {
      setSummarizingIds(prev => { const s = new Set(prev); s.delete(itemId); return s })
    }
  }

  async function handleBatchSummarize() {
    const unsummarized = items.filter(i => !i.summary)
    if (unsummarized.length === 0) {
      setFetchResult('所有条目都已有总结')
      setTimeout(() => setFetchResult(null), 3000)
      return
    }

    setBatchSummarizing(true)
    const ids = unsummarized.map(i => i.id)
    setSummarizingIds(new Set(ids))

    try {
      const res = await fetch('/api/feeds/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: ids }),
      })
      const data = await res.json()
      if (res.ok) {
        // Update items with summaries
        const summaryMap = new Map(
          data.results?.filter((r: any) => r.summary).map((r: any) => [r.id, r.summary]) || []
        )
        setItems(prev => prev.map(i =>
          summaryMap.has(i.id) ? { ...i, summary: summaryMap.get(i.id) as string } : i
        ))
        setFetchResult(`批量总结完成: ${data.succeeded} 成功, ${data.failed} 失败`)
      } else {
        setFetchResult(`批量总结失败: ${data.error}`)
      }
    } catch {
      setFetchResult('批量总结请求失败')
    } finally {
      setBatchSummarizing(false)
      setSummarizingIds(new Set())
      setTimeout(() => setFetchResult(null), 5000)
    }
  }

  async function handleFavorite(item: FeedItemData) {
    try {
      const res = await fetch('/api/feeds/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title, url: item.url, thumbnail: item.thumbnail,
          duration: item.duration, author: item.author, summary: item.summary,
          subtitle: item.subtitle, sourceType: item.sourceType,
        }),
      })
      if (res.status === 409) {
        setToast('已在收藏夹中'); setTimeout(() => setToast(null), 2000); return
      }
      if (res.ok) {
        setToast('已收藏'); setTimeout(() => setToast(null), 2000)
      }
    } catch {}
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('确定删除这条内容？')) return
    const res = await fetch(`/api/feeds/items?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id))
      setTotal(prev => prev - 1)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">加载中...</div>
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-3xl mb-3">📭</div>
        <p className="text-sm">还没有爬取到内容</p>
        <p className="text-xs mt-1">添加订阅源后点击「立即拉取」</p>
        <button
          onClick={handleFetch}
          disabled={fetching}
          className="mt-4 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {fetching ? '拉取中...' : '立即拉取'}
        </button>
      </div>
    )
  }

  const unsummarizedCount = items.filter(i => !i.summary).length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Filters */}
        <div className="flex items-center gap-2">
          {['all', 'bilibili', 'youtube', 'rss'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-full transition ${
                filter === t
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'all' ? `全部 (${total})` : TYPE_BADGE[t]?.label || t}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {unsummarizedCount > 0 && (
            <button
              onClick={handleBatchSummarize}
              disabled={batchSummarizing}
              className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {batchSummarizing ? (
                <><Spinner /> 总结中...</>
              ) : (
                <>批量总结 ({unsummarizedCount})</>
              )}
            </button>
          )}
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5"
          >
            {fetching ? <><Spinner /> 拉取中...</> : '立即拉取'}
          </button>
        </div>
      </div>

      {/* Toasts */}
      {toast && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
          {toast}
        </div>
      )}
      {fetchResult && (
        <div className={`rounded-lg px-4 py-2.5 text-sm ${
          fetchResult.includes('失败') || fetchResult.includes('错误')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {fetchResult}
        </div>
      )}

      {/* Item cards */}
      <div className="space-y-2">
        {items.map(item => {
          const badge = TYPE_BADGE[item.sourceType] || TYPE_BADGE.rss
          const isSummarizing = summarizingIds.has(item.id)

          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all">
              <div className="flex gap-4 p-4">
                {/* Thumbnail — referrerPolicy fixes B站 anti-hotlinking */}
                {item.thumbnail && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <div className="relative w-36 h-20 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      {item.duration && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/75 text-white rounded">
                          {item.duration}
                        </span>
                      )}
                    </div>
                  </a>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                  >
                    {item.title}
                  </a>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-gray-400">{item.author}</span>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-400">{item.publishedAt}</span>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-400">{item.sourceName}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 mt-2">
                    {item.summary ? (
                      <button
                        onClick={() => setExpandedSummary(expandedSummary === item.id ? null : item.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {expandedSummary === item.id ? '收起总结' : '查看总结'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSummarize(item.id)}
                        disabled={isSummarizing}
                        className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50 transition flex items-center gap-1"
                      >
                        {isSummarizing ? (
                          <><Spinner className="w-3 h-3" /> 总结中...</>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI 总结
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleFavorite(item)}
                      className="text-xs text-amber-600 hover:text-amber-800 transition flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      收藏
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-xs text-gray-400 hover:text-red-600 transition flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      删除
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded summary */}
              {expandedSummary === item.id && item.summary && (
                <div className="px-4 pb-4">
                  <FeedSummaryView
                    summary={item.summary}
                    subtitle={item.subtitle}
                    videoUrl={item.url}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
