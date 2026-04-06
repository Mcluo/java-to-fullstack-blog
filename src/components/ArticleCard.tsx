'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isArticleCompleted } from '@/lib/progress'

interface ArticleCardProps {
  article: {
    title: string
    excerpt: string
    category: string
    slug: string
    difficulty?: string
    readTime?: number
    tags?: string[]
    publishedAt?: string
  }
  onTagClick?: (tag: string) => void
}

export default function ArticleCard({ article, onTagClick }: ArticleCardProps) {
  const [isCompleted, setIsCompleted] = useState(false)
  const articleSlug = `${article.category}/${article.slug}`

  useEffect(() => {
    setIsCompleted(isArticleCompleted(articleSlug))
  }, [articleSlug])

  const categoryConfig: Record<string, { name: string; bgColor: string; textColor: string }> = {
    quickstart: { name: '🚀 快速启动', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
    frontend: { name: '前端', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    backend: { name: '后端', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    ai: { name: 'AI', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    devops: { name: 'DevOps', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    projects: { name: '实战项目', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    architecture: { name: '架构设计', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
    'personal-growth': { name: '个人成长', bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
    'tools-and-tips': { name: '工具技巧', bgColor: 'bg-teal-100', textColor: 'text-teal-800' },
    'product-design': { name: '产品设计', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' },
    research: { name: '技术调研', bgColor: 'bg-amber-100', textColor: 'text-amber-800' },
    'work-logs': { name: '工作记录', bgColor: 'bg-slate-100', textColor: 'text-slate-800' },
    troubleshooting: { name: '问题排查', bgColor: 'bg-red-100', textColor: 'text-red-800' },
  }

  const category = categoryConfig[article.category as keyof typeof categoryConfig] || {
    name: article.category,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800'
  }

  const difficultyConfig = {
    beginner: { name: '初级', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    intermediate: { name: '中级', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
    advanced: { name: '高级', bgColor: 'bg-red-100', textColor: 'text-red-700' }
  }

  const difficulty = article.difficulty
    ? difficultyConfig[article.difficulty as keyof typeof difficultyConfig]
    : null

  return (
    <Link href={`/articles/${article.category}/${article.slug}`}>
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow relative">
        {/* 完成标记 */}
        {isCompleted && (
          <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
            ✓
          </div>
        )}

        {/* 分类和难度标签 */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`${category.bgColor} ${category.textColor} px-3 py-1 rounded-full text-sm font-medium`}>
            {category.name}
          </span>
          {difficulty && (
            <span className={`${difficulty.bgColor} ${difficulty.textColor} px-3 py-1 rounded-full text-sm font-medium`}>
              {difficulty.name}
            </span>
          )}
          {article.readTime && (
            <span className="text-gray-500 text-sm">
              {article.readTime} 分钟
            </span>
          )}
        </div>

        {/* 标题 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition">
          {article.title}
        </h2>

        {/* 摘要 */}
        <p className="text-gray-600 mb-4 line-clamp-2">
          {article.excerpt}
        </p>

        {/* 标签和时间 */}
        <div className="flex items-center justify-between mt-auto">
          {article.tags && article.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (onTagClick) {
                      onTagClick(tag)
                    }
                  }}
                  className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded hover:bg-blue-100 hover:text-blue-700 transition cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          ) : <div />}
          {article.publishedAt && (
            <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
              {article.publishedAt.slice(0, 10)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
