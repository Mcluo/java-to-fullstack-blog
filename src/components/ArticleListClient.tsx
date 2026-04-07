'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import ArticleCard from '@/components/ArticleCard'
import SearchBar from '@/components/SearchBar'
import type { ArticleMeta } from '@/lib/articles'

interface CategoryInfo {
  name: string
  slug: string
  group: string
  color: string
}

interface Props {
  articles: ArticleMeta[]
  categories: CategoryInfo[]
  groups: string[]
}

const difficulties = [
  { name: '全部难度', slug: 'all', color: 'bg-gray-100 text-gray-800' },
  { name: '初级', slug: 'beginner', color: 'bg-green-100 text-green-700' },
  { name: '中级', slug: 'intermediate', color: 'bg-yellow-100 text-yellow-700' },
  { name: '高级', slug: 'advanced', color: 'bg-red-100 text-red-700' },
]

export default function ArticleListClient({ articles, categories, groups }: Props) {
  const searchParams = useSearchParams()

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ArticleMeta[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<string>('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const tagFromUrl = searchParams.get('tag')
    if (tagFromUrl) {
      setSelectedTag(tagFromUrl)
    }
  }, [searchParams])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)

    if (!query.trim()) {
      setSearchResults(null)
      setSearchMode('')
      setIsSearching(false)
      return
    }

    // 取消上一次请求
    if (abortRef.current) abortRef.current.abort('new search')
    const controller = new AbortController()
    abortRef.current = controller

    setIsSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
      const data = await res.json()
      setSearchResults(data.results)
      setSearchMode(data.mode || '')
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Search failed:', err)
        setSearchResults(null)
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false)
      }
    }
  }, [])

  // 基础文章列表：搜索结果或全量
  let filteredArticles = searchResults ?? articles

  // 分类/难度/标签筛选仍然在客户端过滤
  if (selectedCategory !== 'all') {
    filteredArticles = filteredArticles.filter(article => article.category === selectedCategory)
  }

  if (selectedDifficulty !== 'all') {
    filteredArticles = filteredArticles.filter(article => article.difficulty === selectedDifficulty)
  }

  if (selectedTag) {
    filteredArticles = filteredArticles.filter(article =>
      article.tags.includes(selectedTag)
    )
  }

  const clearFilters = () => {
    setSelectedCategory('all')
    setSelectedDifficulty('all')
    setSelectedTag(null)
    setSearchQuery('')
    setSearchResults(null)
    setSearchMode('')
  }

  const hasActiveFilters = selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedTag !== null || searchQuery.trim() !== ''

  return (
    <>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">文章</h1>
        <p className="text-gray-500 mb-6">
          技术学习、工程实践与思考
        </p>
        <div className="max-w-lg">
          <SearchBar
            onSearch={handleSearch}
            placeholder="搜索标题、正文、标签..."
            debounceMs={400}
          />
        </div>
      </div>

      {/* 筛选器 */}
      <div className="mb-8 space-y-4 bg-white rounded-2xl border border-gray-100 p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">分类</h3>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                全部
              </button>
            )}
          </div>
          {groups.map((group) => {
            const groupCategories = categories.filter(c => c.group === group)
            if (groupCategories.length === 0) return null
            return (
              <div key={group} className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-gray-400 w-16 shrink-0 font-medium">{group}</span>
                {groupCategories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(selectedCategory === cat.slug ? 'all' : cat.slug)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === cat.slug
                        ? cat.color + ' ring-1 ring-blue-400 shadow-sm'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        <div className="pt-2 border-t border-gray-50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">难度</h3>
          <div className="flex gap-1.5 flex-wrap">
            {difficulties.map((diff) => (
              <button
                key={diff.slug}
                onClick={() => setSelectedDifficulty(diff.slug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedDifficulty === diff.slug
                    ? diff.color + ' ring-1 ring-blue-400 shadow-sm'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {diff.name}
              </button>
            ))}
          </div>
        </div>

        {selectedTag && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl ring-1 ring-blue-100">
            <span className="text-xs text-blue-700 font-medium">
              标签: #{selectedTag}
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className="ml-auto text-xs text-blue-500 hover:text-blue-700 font-medium"
            >
              清除
            </button>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              重置筛选
            </button>
          </div>
        )}
      </div>

      {/* 结果统计 */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isSearching ? (
            <span className="text-gray-400">搜索中...</span>
          ) : (
            <>
              <span className="font-semibold text-gray-900">{filteredArticles.length}</span> 篇文章
              {hasActiveFilters && (
                <span className="text-gray-400 ml-1">
                  / {articles.length}
                </span>
              )}
              {searchMode === 'semantic' && searchQuery && (
                <span className="text-blue-500 ml-2 text-xs">语义搜索</span>
              )}
            </>
          )}
        </p>
      </div>

      {/* 文章列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isSearching ? (
          <div className="col-span-full text-center py-16">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 text-sm">正在搜索文章内容...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-500 mb-3">没有找到匹配的文章</p>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              重置筛选
            </button>
          </div>
        ) : (
          filteredArticles.map((article, index) => (
            <ArticleCard
              key={index}
              article={article}
              onTagClick={(tag) => setSelectedTag(tag)}
            />
          ))
        )}
      </div>
    </>
  )
}
