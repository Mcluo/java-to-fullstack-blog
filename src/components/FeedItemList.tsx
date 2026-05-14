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
  userInsights?: string[]
  fetchedAt: string
  sourceType: 'rss' | 'bilibili' | 'youtube'
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  bilibili: { label: 'B站', color: 'bg-pink-100 text-pink-700' },
  youtube: { label: 'YouTube', color: 'bg-red-100 text-red-700' },
  rss: { label: 'RSS', color: 'bg-green-100 text-green-700' },
}

const STOP_WORDS = new Set([
  '的', '了', '和', '在', '是', '到', '一', '这', '我', '你', '他', '她', '们',
  '啊', '吗', '吧', '呢', '么', '对', '也', '都', '就', '把', '被', '从', '有',
  '没', '不', '很', '太', '最', '更', '又', '再', '与', '为', '以', '及', '其',
  'the', 'a', 'an', 'is', 'in', 'of', 'to', 'and', 'for', 'with', 'how', 'ep',
])

function extractTags(items: FeedItemData[]): string[] {
  const freq: Record<string, number> = {}
  for (const item of items) {
    const enWords = item.title.match(/[a-zA-Z]{3,}/g) || []
    for (const w of enWords) {
      const lower = w.toLowerCase()
      if (!STOP_WORDS.has(lower)) freq[lower] = (freq[lower] || 0) + 1
    }
    const cnChars = item.title.replace(/[^\u4e00-\u9fff]/g, ' ')
    const cnWords = cnChars.split(/\s+/).filter(w => w.length >= 2 && w.length <= 4)
    for (const w of cnWords) {
      if (!STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1
    }
  }
  return Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word)
}

function Spinner({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function SourceAvatar({ name, sourceType }: { name: string; sourceType: string }) {
  const colors: Record<string, string> = {
    bilibili: 'bg-pink-100 text-pink-600',
    youtube: 'bg-red-100 text-red-600',
    rss: 'bg-green-100 text-green-600',
  }
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${colors[sourceType] || 'bg-gray-100 text-gray-500'}`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

export default function FeedItemList() {
  const [items, setItems] = useState<FeedItemData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [fetchResult, setFetchResult] = useState<string | null>(null)
  const [summarizingIds, setSummarizingIds] = useState<Set<string>>(new Set())
  const [batchSummarizing, setBatchSummarizing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [collapsedSources, setCollapsedSources] = useState<Set<string>>(new Set())
  const [activeTags, setActiveTags] = useState<Record<string, string>>({})

  useEffect(() => { fetchItems() }, [filter])

  async function fetchItems() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
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
    finally { setFetching(false); setTimeout(() => setFetchResult(null), 5000) }
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
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, summary: data.results[0].summary } : i))
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
      setFetchResult('所有条目都已有总结'); setTimeout(() => setFetchResult(null), 3000); return
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
        const summaryMap = new Map(
          data.results?.filter((r: any) => r.summary).map((r: any) => [r.id, r.summary]) || []
        )
        setItems(prev => prev.map(i => summaryMap.has(i.id) ? { ...i, summary: summaryMap.get(i.id) as string } : i))
        setFetchResult(`批量总结完成: ${data.succeeded} 成功, ${data.failed} 失败`)
      } else {
        setFetchResult(`批量总结失败: ${data.error}`)
      }
    } catch { setFetchResult('批量总结请求失败') }
    finally { setBatchSummarizing(false); setSummarizingIds(new Set()); setTimeout(() => setFetchResult(null), 5000) }
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
      if (res.status === 409) { setToast('已在收藏夹中'); setTimeout(() => setToast(null), 2000); return }
      if (res.ok) { setToast('已收藏'); setTimeout(() => setToast(null), 2000) }
    } catch {}
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('确定删除这条内容？')) return
    const res = await fetch(`/api/feeds/items?id=${id}`, { method: 'DELETE' })
    if (res.ok) { setItems(prev => prev.filter(i => i.id !== id)); setTotal(prev => prev - 1) }
  }

  function toggleSource(sourceId: string) {
    setCollapsedSources(prev => {
      const s = new Set(prev); s.has(sourceId) ? s.delete(sourceId) : s.add(sourceId); return s
    })
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">加载中...</div>

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-3xl mb-3">📭</div>
        <p className="text-sm">还没有爬取到内容</p>
        <p className="text-xs mt-1">添加订阅源后点击「立即拉取」</p>
        <button onClick={handleFetch} disabled={fetching}
          className="mt-4 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50 transition">
          {fetching ? '拉取中...' : '立即拉取'}
        </button>
      </div>
    )
  }

  const unsummarizedCount = items.filter(i => !i.summary).length

  // 搜索过滤
  const filtered = search
    ? items.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.sourceName.toLowerCase().includes(search.toLowerCase())
      )
    : items

  // 按 sourceId 分组
  const groups: { sourceId: string; sourceName: string; sourceType: string; items: FeedItemData[] }[] = []
  const seen = new Map<string, number>()
  for (const item of filtered) {
    if (seen.has(item.sourceId)) {
      groups[seen.get(item.sourceId)!].items.push(item)
    } else {
      seen.set(item.sourceId, groups.length)
      groups.push({ sourceId: item.sourceId, sourceName: item.sourceName, sourceType: item.sourceType, items: [item] })
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {['all', 'bilibili', 'youtube', 'rss'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-full transition ${filter === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === 'all' ? `全部 (${total})` : TYPE_BADGE[t]?.label || t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {unsummarizedCount > 0 && (
            <button onClick={handleBatchSummarize} disabled={batchSummarizing}
              className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 disabled:opacity-50 transition flex items-center gap-1.5">
              {batchSummarizing ? <><Spinner /> 总结中...</> : <>批量总结 ({unsummarizedCount})</>}
            </button>
          )}
          <button onClick={handleFetch} disabled={fetching}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5">
            {fetching ? <><Spinner /> 拉取中...</> : '立即拉取'}
          </button>
        </div>
      </div>

      {toast && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">{toast}</div>}
      {fetchResult && (
        <div className={`rounded-lg px-4 py-2.5 text-sm ${fetchResult.includes('失败') || fetchResult.includes('错误') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {fetchResult}
        </div>
      )}

      {/* 搜索框 */}
      {items.length > 3 && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索订阅内容..."
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      )}

      <div className="text-xs text-gray-400">{filtered.length} 条内容 · {groups.length} 个订阅源</div>

      {/* 三层结构 */}
      <div className="space-y-3">
        {groups.map(group => {
          const isCollapsed = collapsedSources.has(group.sourceId)
          const badge = TYPE_BADGE[group.sourceType] || TYPE_BADGE.rss
          const tags = extractTags(group.items)
          const activeTag = activeTags[group.sourceId] || '全部'
          const visibleItems = activeTag === '全部'
            ? group.items
            : group.items.filter(item => item.title.includes(activeTag))

          return (
            <div key={group.sourceId} className="border border-gray-100 rounded-xl overflow-hidden">

              {/* ── Level 1: 订阅源 ── */}
              <button
                onClick={() => toggleSource(group.sourceId)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
              >
                <SourceAvatar name={group.sourceName} sourceType={group.sourceType} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{group.sourceName}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${badge.color}`}>{badge.label}</span>
                  </div>
                  <span className="text-xs text-gray-400">{group.items.length} 个视频</span>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-gray-50">
                  {/* ── Level 2: Tag 标签 ── */}
                  {tags.length > 0 && (
                    <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap bg-white">
                      <button
                        onClick={() => setActiveTags(prev => ({ ...prev, [group.sourceId]: '全部' }))}
                        className={`px-2.5 py-1 text-xs rounded-full transition ${activeTag === '全部' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        全部 ({group.items.length})
                      </button>
                      {tags.map(tag => {
                        const count = group.items.filter(i => i.title.includes(tag)).length
                        return (
                          <button key={tag}
                            onClick={() => setActiveTags(prev => ({ ...prev, [group.sourceId]: tag }))}
                            className={`px-2.5 py-1 text-xs rounded-full transition ${activeTag === tag ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                            {tag} ({count})
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* ── Level 3: 视频列表 ── */}
                  <div className="divide-y divide-gray-50">
                    {visibleItems.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-gray-400">无匹配内容</div>
                    ) : visibleItems.map(item => {
                      const isSummarizing = summarizingIds.has(item.id)
                      return (
                        <div key={item.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                          <div className="flex gap-3 px-4 py-3">
                            {item.thumbnail && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <div className="relative w-28 rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
                                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                  {item.duration && (
                                    <span className="absolute bottom-1 right-1 px-1 py-0.5 text-[10px] font-medium bg-black/75 text-white rounded">{item.duration}</span>
                                  )}
                                </div>
                              </a>
                            )}
                            <div className="flex-1 min-w-0">
                              <a href={item.url} target="_blank" rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                                {item.title}
                              </a>
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 flex-wrap">
                                {item.author && <span>{item.author}</span>}
                                {item.author && <span className="text-gray-300">·</span>}
                                <span>{item.publishedAt}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5">
                                {item.summary ? (
                                  <button
                                    onClick={() => setExpandedSummary(expandedSummary === item.id ? null : item.id)}
                                    className="text-xs text-blue-600 hover:text-blue-800 transition flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {expandedSummary === item.id ? '收起' : '查看总结'}
                                  </button>
                                ) : (
                                  <button onClick={() => handleSummarize(item.id)} disabled={isSummarizing}
                                    className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50 transition flex items-center gap-1">
                                    {isSummarizing ? <><Spinner className="w-3 h-3" /> 总结中...</> : (
                                      <>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        AI 总结
                                      </>
                                    )}
                                  </button>
                                )}
                                <button onClick={() => handleFavorite(item)}
                                  className="text-xs text-amber-600 hover:text-amber-800 transition flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                  </svg>
                                  收藏
                                </button>
                                <button onClick={() => handleDeleteItem(item.id)}
                                  className="text-xs text-gray-400 hover:text-red-600 transition flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  删除
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 用户洞见 */}
                          {item.userInsights && item.userInsights.length > 0 && (
                            <div className="mx-4 mb-2 px-3 py-2 bg-purple-50 border border-purple-100 rounded-lg">
                              <p className="text-[10px] font-medium text-purple-500 uppercase tracking-wide mb-1">我的洞见</p>
                              <ul className="space-y-0.5">
                                {item.userInsights.map((ins, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-purple-800">
                                    <span className="text-purple-400 shrink-0">•</span>
                                    <span>{ins}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 总结展开 */}
                          {expandedSummary === item.id && item.summary && (
                            <div className="px-4 pb-4">
                              <FeedSummaryView
                                summary={item.summary}
                                subtitle={item.subtitle}
                                videoUrl={item.url}
                                videoTitle={item.title}
                                itemId={item.id}
                                itemType="feedItem"
                                onInsightsSaved={(insights) => setItems(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, userInsights: [...(i.userInsights || []), ...insights] } : i
                                ))}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
