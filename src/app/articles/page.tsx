'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import ArticleCard from '@/components/ArticleCard'
import SearchBar from '@/components/SearchBar'

export default function ArticlesPage() {
  const searchParams = useSearchParams()

  const articles = [
    {
      title: 'TypeScript + React 全栈项目 30分钟快速上手',
      excerpt: '用AI工具30分钟搭建一个可部署的TODO应用，边做边学TypeScript和React核心概念',
      category: 'quickstart',
      slug: '01-typescript-react-30min',
      tags: ['typescript', 'react', 'ai-assisted', 'quickstart'],
      difficulty: 'beginner',
      readTime: 30,
      badge: '🚀 AI辅助'
    },
    {
      title: 'TypeScript 快速入门：Java 工程师视角',
      excerpt: '从 Java 开发者的角度理解 TypeScript，对比两种语言的类型系统、面向对象特性和开发模式',
      category: 'frontend',
      slug: '01-typescript-for-java-developers',
      tags: ['typescript', 'javascript', 'java'],
      difficulty: 'beginner',
      readTime: 20
    },
    {
      title: 'React 核心概念：对比 Java Spring 框架',
      excerpt: '通过 Spring 框架的概念类比，快速理解 React 的组件、状态管理、依赖注入和生命周期',
      category: 'frontend',
      slug: '02-react-vs-spring',
      tags: ['react', 'spring', 'components'],
      difficulty: 'beginner',
      readTime: 25
    },
    {
      title: 'Node.js 异步编程：对比 Java 多线程模型',
      excerpt: '理解 Node.js 的事件循环机制，对比 Java 的多线程并发模型，掌握 async/await 模式',
      category: 'backend',
      slug: '01-nodejs-async-programming',
      tags: ['nodejs', 'async', 'java'],
      difficulty: 'intermediate',
      readTime: 25
    },
    {
      title: 'Python 基础速成：Java 开发者版',
      excerpt: '通过 Java 对比快速掌握 Python 核心语法、数据结构和面向对象编程',
      category: 'ai',
      slug: '01-python-for-java-developers',
      tags: ['python', 'java', 'syntax'],
      difficulty: 'beginner',
      readTime: 20
    }
  ]

  const categories = [
    { name: '全部', slug: 'all', color: 'bg-gray-100 text-gray-800' },
    { name: '🚀 快速启动', slug: 'quickstart', color: 'bg-orange-100 text-orange-800' },
    { name: '前端', slug: 'frontend', color: 'bg-blue-100 text-blue-800' },
    { name: '后端', slug: 'backend', color: 'bg-green-100 text-green-800' },
    { name: 'AI', slug: 'ai', color: 'bg-purple-100 text-purple-800' },
  ]

  const difficulties = [
    { name: '全部难度', slug: 'all', color: 'bg-gray-100 text-gray-800' },
    { name: '初级', slug: 'beginner', color: 'bg-green-100 text-green-700' },
    { name: '中级', slug: 'intermediate', color: 'bg-yellow-100 text-yellow-700' },
    { name: '高级', slug: 'advanced', color: 'bg-red-100 text-red-700' },
  ]

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 从URL参数读取标签筛选
  useEffect(() => {
    const tagFromUrl = searchParams.get('tag')
    if (tagFromUrl) {
      setSelectedTag(tagFromUrl)
    }
  }, [searchParams])

  // 筛选逻辑
  let filteredArticles = articles

  // 按搜索关键词筛选
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    filteredArticles = filteredArticles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  // 按分类筛选
  if (selectedCategory !== 'all') {
    filteredArticles = filteredArticles.filter(article => article.category === selectedCategory)
  }

  // 按难度筛选
  if (selectedDifficulty !== 'all') {
    filteredArticles = filteredArticles.filter(article => article.difficulty === selectedDifficulty)
  }

  // 按标签筛选
  if (selectedTag) {
    filteredArticles = filteredArticles.filter(article =>
      article.tags.includes(selectedTag)
    )
  }

  // 获取所有唯一标签
  const allTags = Array.from(new Set(articles.flatMap(article => article.tags)))

  // 清除所有筛选
  const clearFilters = () => {
    setSelectedCategory('all')
    setSelectedDifficulty('all')
    setSelectedTag(null)
    setSearchQuery('')
  }

  // 检查是否有筛选条件
  const hasActiveFilters = selectedCategory !== 'all' || selectedDifficulty !== 'all' || selectedTag !== null || searchQuery.trim() !== ''

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">教程文章</h1>
        <p className="text-xl text-gray-600 mb-6">
          从 Java 到全栈+AI 的完整学习路径
        </p>

        {/* 搜索栏 */}
        <div className="max-w-2xl">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="搜索标题、内容、标签..."
          />
        </div>
      </div>

      {/* 筛选器区域 */}
      <div className="mb-8 space-y-4">
        {/* 分类筛选 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📂 分类</h3>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedCategory === cat.slug
                    ? cat.color + ' ring-2 ring-blue-500'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 难度筛选 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 难度</h3>
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

        {/* 标签筛选 */}
        {selectedTag && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border-l-4 border-blue-600 rounded-r">
            <span className="text-sm text-blue-800">
              <strong>当前标签:</strong> #{selectedTag}
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className="ml-auto text-blue-600 hover:text-blue-800 font-medium"
            >
              ✕ 清除
            </button>
          </div>
        )}

        {/* 清除所有筛选按钮 */}
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

      {/* 筛选结果统计 */}
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
    </div>
  )
}
