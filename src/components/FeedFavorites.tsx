'use client'

import { useState, useEffect } from 'react'
import FeedSummaryView from './FeedSummaryView'

interface FavoriteItem {
  id: string
  title: string
  url: string
  thumbnail?: string
  duration?: string
  author: string
  summary?: string
  subtitle?: string
  sourceType: string
  savedAt: string
  note?: string
  userInsights?: string[]
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  bilibili: { label: 'B站', color: 'bg-pink-100 text-pink-700' },
  youtube: { label: 'YouTube', color: 'bg-red-100 text-red-700' },
  rss: { label: 'RSS', color: 'bg-green-100 text-green-700' },
  web: { label: '网页', color: 'bg-gray-100 text-gray-600' },
}

const STOP_WORDS = new Set([
  '的', '了', '和', '在', '是', '到', '一', '这', '我', '你', '他', '她', '它',
  '们', '啊', '吗', '吧', '呢', '么', '呀', '嗯', '哦', '哈', '对', '也', '都',
  '就', '把', '被', '从', '有', '没', '不', '很', '太', '最', '更', '又', '再',
  'the', 'a', 'an', 'is', 'in', 'of', 'to', 'and', 'for', 'with', 'how',
])

function extractTags(items: FavoriteItem[]): string[] {
  const freq: Record<string, number> = {}
  for (const item of items) {
    // 按中英文分词：中文按2-4字切片，英文按单词
    const title = item.title
    // 英文单词
    const enWords = title.match(/[a-zA-Z]{2,}/g) || []
    for (const w of enWords) {
      const lower = w.toLowerCase()
      if (!STOP_WORDS.has(lower)) freq[lower] = (freq[lower] || 0) + 1
    }
    // 中文2-4字连续片段
    const cnChars = title.replace(/[^\u4e00-\u9fff]/g, ' ')
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

function AuthorAvatar({ author, sourceType }: { author: string; sourceType: string }) {
  const colors: Record<string, string> = {
    bilibili: 'bg-pink-100 text-pink-600',
    youtube: 'bg-red-100 text-red-600',
    rss: 'bg-green-100 text-green-600',
    web: 'bg-gray-100 text-gray-500',
  }
  const cls = colors[sourceType] || colors.web
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${cls}`}>
      {(author || '?')[0].toUpperCase()}
    </div>
  )
}

export default function FeedFavorites() {
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [collapsedAuthors, setCollapsedAuthors] = useState<Set<string>>(new Set())
  const [activeTags, setActiveTags] = useState<Record<string, string>>({})

  useEffect(() => { fetchFavorites() }, [])

  async function fetchFavorites() {
    setLoading(true)
    try {
      const res = await fetch('/api/feeds/favorites')
      setItems(await res.json())
    } catch {} finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定从收藏夹移除？')) return
    await fetch(`/api/feeds/favorites?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function toggleAuthor(author: string) {
    setCollapsedAuthors(prev => {
      const s = new Set(prev)
      s.has(author) ? s.delete(author) : s.add(author)
      return s
    })
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">加载中...</div>

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-3xl mb-3">⭐</div>
        <p className="text-sm">还没有收藏</p>
        <p className="text-xs mt-1">在订阅内容或快速总结中点击收藏按钮</p>
      </div>
    )
  }

  // 搜索过滤
  const filtered = search
    ? items.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.author.toLowerCase().includes(search.toLowerCase())
      )
    : items

  // 按 author 分组
  const groups: { author: string; sourceType: string; items: FavoriteItem[] }[] = []
  const seen = new Map<string, number>()
  for (const item of filtered) {
    const key = item.author || '其他'
    if (seen.has(key)) {
      groups[seen.get(key)!].items.push(item)
    } else {
      seen.set(key, groups.length)
      groups.push({ author: key, sourceType: item.sourceType, items: [item] })
    }
  }

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      {items.length > 3 && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索收藏..."
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      )}

      <div className="text-xs text-gray-400">{filtered.length} 个收藏 · {groups.length} 位博主</div>

      {/* 三层结构 */}
      <div className="space-y-3">
        {groups.map(group => {
          const isCollapsed = collapsedAuthors.has(group.author)
          const tags = extractTags(group.items)
          const activeTag = activeTags[group.author] || '全部'
          const badge = TYPE_BADGE[group.sourceType] || TYPE_BADGE.web

          const visibleItems = activeTag === '全部'
            ? group.items
            : group.items.filter(item => item.title.includes(activeTag))

          return (
            <div key={group.author} className="border border-gray-100 rounded-xl overflow-hidden">

              {/* ── Level 1: 博主 ── */}
              <button
                onClick={() => toggleAuthor(group.author)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
              >
                <AuthorAvatar author={group.author} sourceType={group.sourceType} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{group.author}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{group.items.length} 个收藏</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-gray-50">
                  {/* ── Level 2: Tag 标签 ── */}
                  {tags.length > 0 && (
                    <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap bg-white">
                      <button
                        onClick={() => setActiveTags(prev => ({ ...prev, [group.author]: '全部' }))}
                        className={`px-2.5 py-1 text-xs rounded-full transition ${
                          activeTag === '全部'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        全部 ({group.items.length})
                      </button>
                      {tags.map(tag => {
                        const count = group.items.filter(i => i.title.includes(tag)).length
                        return (
                          <button
                            key={tag}
                            onClick={() => setActiveTags(prev => ({ ...prev, [group.author]: tag }))}
                            className={`px-2.5 py-1 text-xs rounded-full transition ${
                              activeTag === tag
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
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
                    ) : (
                      visibleItems.map(item => {
                        const itemBadge = TYPE_BADGE[item.sourceType] || TYPE_BADGE.web
                        return (
                          <div key={item.id} className="bg-white">
                            <div className="flex gap-3 px-4 py-3">
                              {item.thumbnail && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                  <div className="relative w-28 rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
                                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                    {item.duration && (
                                      <span className="absolute bottom-1 right-1 px-1 py-0.5 text-[10px] font-medium bg-black/75 text-white rounded">
                                        {item.duration}
                                      </span>
                                    )}
                                  </div>
                                </a>
                              )}
                              <div className="flex-1 min-w-0">
                                <a href={item.url} target="_blank" rel="noopener noreferrer"
                                  className="text-sm font-medium text-gray-900 hover:text-blue-600 transition line-clamp-2">
                                  {item.title}
                                </a>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-xs text-gray-400">{item.savedAt.slice(0, 10)}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                  {item.summary && (
                                    <button
                                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                      className="text-xs text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      {expandedId === item.id ? '收起' : '查看总结'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className="text-xs text-gray-400 hover:text-red-600 transition flex items-center gap-1"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    移除
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
                            {expandedId === item.id && item.summary && (
                              <div className="px-4 pb-4">
                                <FeedSummaryView
                                  summary={item.summary}
                                  subtitle={item.subtitle}
                                  videoUrl={item.url}
                                  videoTitle={item.title}
                                  itemId={item.id}
                                  itemType="favorite"
                                  onInsightsSaved={(insights) => setItems(prev => prev.map(i =>
                                    i.id === item.id
                                      ? { ...i, userInsights: [...(i.userInsights || []), ...insights] }
                                      : i
                                  ))}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
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
