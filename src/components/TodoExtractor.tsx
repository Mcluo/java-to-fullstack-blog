'use client'

import { useState, useEffect } from 'react'
import { type TodoPriority, PRIORITY_CONFIG, CATEGORY_CONFIG } from '@/lib/todos'

interface ArticleMeta {
  title: string
  category: string
  slug: string
  tags: string[]
  publishedAt?: string
}

interface ExtractedTodo {
  title: string
  priority: TodoPriority
  category: string
  selected: boolean
}

interface TodoExtractorProps {
  onExtracted: (items: { title: string; priority: TodoPriority; category: string }[]) => void
  onClose: () => void
}

export default function TodoExtractor({ onExtracted, onClose }: TodoExtractorProps) {
  const [articles, setArticles] = useState<ArticleMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedTodo[]>([])
  const [selectedArticle, setSelectedArticle] = useState<ArticleMeta | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/articles')
      .then(r => r.json())
      .then(data => {
        setArticles(data)
        setLoading(false)
      })
      .catch(() => {
        setError('加载文章列表失败')
        setLoading(false)
      })
  }, [])

  const handleExtract = async (article: ArticleMeta) => {
    setSelectedArticle(article)
    setExtracting(true)
    setError('')
    setExtracted([])

    try {
      const res = await fetch('/api/todos/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: article.category, slug: article.slug }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '提取失败')
      }

      const data = await res.json()
      setExtracted(
        data.todos.map((t: { title: string; priority: number; category: string }) => ({
          ...t,
          priority: Math.min(4, Math.max(1, t.priority)) as TodoPriority,
          selected: true,
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '提取失败')
    } finally {
      setExtracting(false)
    }
  }

  const toggleItem = (idx: number) => {
    setExtracted(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item))
  }

  const toggleAll = () => {
    const allSelected = extracted.every(i => i.selected)
    setExtracted(prev => prev.map(item => ({ ...item, selected: !allSelected })))
  }

  const handleConfirm = () => {
    const selected = extracted.filter(i => i.selected)
    if (selected.length === 0) return
    onExtracted(selected.map(({ title, priority, category }) => ({ title, priority, category })))
  }

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase())
  )

  // 已提取到 todo，展示确认面板
  if (extracted.length > 0) {
    const selectedCount = extracted.filter(i => i.selected).length
    return (
      <div className="bg-white rounded-2xl border border-violet-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              从「{selectedArticle?.title}」提取了 {extracted.length} 个待办
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">勾选要添加的项目</p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleAll} className="text-xs text-violet-500 hover:text-violet-700">
              {extracted.every(i => i.selected) ? '取消全选' : '全选'}
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {extracted.map((item, idx) => (
            <label
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                item.selected
                  ? 'border-violet-200 bg-violet-50/50'
                  : 'border-gray-100 bg-gray-50/50 opacity-60'
              }`}
            >
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => toggleItem(idx)}
                className="mt-0.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{item.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs ${PRIORITY_CONFIG[item.priority].color}`}>
                    {PRIORITY_CONFIG[item.priority].label}
                  </span>
                  <span className="text-xs text-gray-400">{item.category}</span>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => { setExtracted([]); setSelectedArticle(null) }}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            重新选择
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:shadow-md disabled:opacity-40 transition-all"
          >
            添加 {selectedCount} 个待办
          </button>
        </div>
      </div>
    )
  }

  // 文章选择面板
  return (
    <div className="bg-white rounded-2xl border border-violet-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">从文章中提炼待办事项</h3>
          <p className="text-xs text-gray-400 mt-0.5">AI 会分析文章内容，提取可执行的行动项</p>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="搜索文章..."
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 placeholder:text-gray-300"
      />

      {error && (
        <div className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2 mb-3">{error}</div>
      )}

      {extracting && (
        <div className="flex items-center justify-center py-8 text-violet-500">
          <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">AI 正在分析「{selectedArticle?.title}」...</span>
        </div>
      )}

      {!extracting && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="text-sm text-gray-400 text-center py-8">加载文章列表...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8">没有匹配的文章</div>
          ) : (
            filteredArticles.slice(0, 20).map(article => (
              <button
                key={`${article.category}/${article.slug}`}
                onClick={() => handleExtract(article)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-violet-50 transition-colors group"
              >
                <p className="text-sm text-gray-700 group-hover:text-violet-700 truncate">{article.title}</p>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{article.category}</span>
                  {article.publishedAt && (
                    <span className="text-xs text-gray-300">{article.publishedAt}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
