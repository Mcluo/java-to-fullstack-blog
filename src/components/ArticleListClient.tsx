'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const tagFromUrl = searchParams.get('tag')
    if (tagFromUrl) {
      setSelectedTag(tagFromUrl)
    }
  }, [searchParams])

  let filteredArticles = articles

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    filteredArticles = filteredArticles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

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
  }

  const hasActiveFilters = selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedTag !== null || searchQuery.trim() !== ''

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">文章</h1>
        <p className="text-xl text-gray-600 mb-6">
          技术学习、工程实践与思考
        </p>
        <div className="max-w-2xl">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="搜索标题、内容、标签..."
          />
        </div>
      </div>

      {/* 筛选器 */}
      <div className="mb-8 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-700">分类</h3>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                显示全部
              </button>
            )}
          </div>
          {groups.map((group) => {
            const groupCategories = categories.filter(c => c.group === group)
            if (groupCategories.length === 0) return null
            return (
              <div key={group} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 w-16 shrink-0">{group}</span>
                {groupCategories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(selectedCategory === cat.slug ? 'all' : cat.slug)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      selectedCategory === cat.slug
                        ? cat.color + ' ring-2 ring-blue-500'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">难度</h3>
          <div className="flex gap-2 flex-wrap">
            {difficulties.map((diff) => (
              <button
                key={diff.slug}
                onClick={() => setSelectedDifficulty(diff.slug)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedDifficulty === diff.slug
                    ? diff.color + ' ring-2 ring-blue-500'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {diff.name}
              </button>
            ))}
          </div>
        </div>

        {selectedTag && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border-l-4 border-blue-600 rounded-r">
            <span className="text-sm text-blue-800">
              <strong>当前标签:</strong> #{selectedTag}
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className="ml-auto text-blue-600 hover:text-blue-800 font-medium"
            >
              清除
            </button>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              清除所有筛选
            </button>
          </div>
        )}
      </div>

      {/* 结果统计 */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          找到 <strong className="text-blue-600">{filteredArticles.length}</strong> 篇文章
          {hasActiveFilters && (
            <span className="text-sm text-gray-500 ml-2">
              （共 {articles.length} 篇）
            </span>
          )}
        </p>
      </div>

      {/* 文章列表 */}
      <div className="grid grid-cols-1 gap-8">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">没有找到匹配的文章</p>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:underline"
            >
              清除筛选条件
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
