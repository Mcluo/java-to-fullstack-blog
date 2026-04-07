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

  const categoryConfig: Record<string, { name: string; color: string }> = {
    quickstart: { name: '快速启动', color: 'text-orange-600 bg-orange-50 ring-orange-100' },
    frontend: { name: '前端', color: 'text-blue-600 bg-blue-50 ring-blue-100' },
    backend: { name: '后端', color: 'text-emerald-600 bg-emerald-50 ring-emerald-100' },
    ai: { name: 'AI', color: 'text-violet-600 bg-violet-50 ring-violet-100' },
    devops: { name: 'DevOps', color: 'text-amber-600 bg-amber-50 ring-amber-100' },
    projects: { name: '实战项目', color: 'text-rose-600 bg-rose-50 ring-rose-100' },
    architecture: { name: '架构设计', color: 'text-indigo-600 bg-indigo-50 ring-indigo-100' },
    'personal-growth': { name: '个人成长', color: 'text-pink-600 bg-pink-50 ring-pink-100' },
    'tools-and-tips': { name: '工具技巧', color: 'text-teal-600 bg-teal-50 ring-teal-100' },
    'product-design': { name: '产品设计', color: 'text-cyan-600 bg-cyan-50 ring-cyan-100' },
    research: { name: '技术调研', color: 'text-amber-700 bg-amber-50 ring-amber-100' },
    'work-logs': { name: '工作记录', color: 'text-slate-600 bg-slate-50 ring-slate-100' },
    troubleshooting: { name: '问题排查', color: 'text-red-600 bg-red-50 ring-red-100' },
    skill: { name: 'Skill', color: 'text-emerald-600 bg-emerald-50 ring-emerald-100' },
    'learning-notes': { name: '学习笔记', color: 'text-sky-600 bg-sky-50 ring-sky-100' },
  }

  const category = categoryConfig[article.category] || {
    name: article.category,
    color: 'text-gray-600 bg-gray-50 ring-gray-100',
  }

  const difficultyConfig: Record<string, { name: string; color: string }> = {
    beginner: { name: '初级', color: 'text-emerald-600' },
    intermediate: { name: '中级', color: 'text-amber-600' },
    advanced: { name: '高级', color: 'text-rose-600' },
  }

  const difficulty = article.difficulty
    ? difficultyConfig[article.difficulty]
    : null

  return (
    <Link href={`/articles/${article.category}/${article.slug}`}>
      <div className="group relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-lg hover:shadow-gray-100/80">
        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute top-5 right-5 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium ring-1 ring-emerald-100">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            已完成
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ring-1 ${category.color}`}>
            {category.name}
          </span>
          {difficulty && (
            <span className={`text-xs font-medium ${difficulty.color}`}>
              {difficulty.name}
            </span>
          )}
          {article.readTime && (
            <span className="text-xs text-gray-400 ml-auto">
              {article.readTime} min
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 pr-20">
          {article.title}
        </h2>

        {/* Excerpt */}
        <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>

        {/* Tags & date */}
        <div className="flex items-center justify-between">
          {article.tags && article.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.slice(0, 4).map((tag, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onTagClick?.(tag)
                  }}
                  className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          ) : <div />}
          {article.publishedAt && (
            <span className="text-[11px] text-gray-400 whitespace-nowrap ml-4 tabular-nums">
              {article.publishedAt.slice(0, 10)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
