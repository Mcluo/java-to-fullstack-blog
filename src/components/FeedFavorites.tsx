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
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  bilibili: { label: 'B站', color: 'bg-pink-100 text-pink-700' },
  youtube: { label: 'YouTube', color: 'bg-red-100 text-red-700' },
  rss: { label: 'RSS', color: 'bg-green-100 text-green-700' },
  web: { label: '网页', color: 'bg-gray-100 text-gray-600' },
}

export default function FeedFavorites() {
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">加载中...</div>

  const filtered = search
    ? items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.author.toLowerCase().includes(search.toLowerCase()))
    : items

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-3xl mb-3">&#11088;</div>
        <p className="text-sm">还没有收藏</p>
        <p className="text-xs mt-1">在订阅内容或快速总结中点击收藏按钮</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      {items.length > 3 && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索收藏..."
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      )}

      <div className="text-xs text-gray-400">{filtered.length} 个收藏</div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(item => {
          const badge = TYPE_BADGE[item.sourceType] || TYPE_BADGE.web
          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-all">
              <div className="flex gap-4 p-4">
                {item.thumbnail && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <div className="relative w-32 h-18 rounded-lg overflow-hidden bg-gray-100">
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                      {item.duration && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/75 text-white rounded">{item.duration}</span>
                      )}
                    </div>
                  </a>
                )}
                <div className="flex-1 min-w-0">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition line-clamp-2">
                    {item.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${badge.color}`}>{badge.label}</span>
                    <span className="text-xs text-gray-400">{item.author}</span>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-400">收藏于 {item.savedAt.slice(0, 10)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {item.summary && (
                      <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="text-xs text-blue-600 hover:text-blue-800 transition flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {expandedId === item.id ? '收起' : '查看总结'}
                      </button>
                    )}
                    <button onClick={() => handleDelete(item.id)} className="text-xs text-gray-400 hover:text-red-600 transition flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      移除
                    </button>
                  </div>
                </div>
              </div>
              {expandedId === item.id && item.summary && (
                <div className="px-4 pb-4">
                  <FeedSummaryView summary={item.summary} subtitle={item.subtitle} videoUrl={item.url} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
