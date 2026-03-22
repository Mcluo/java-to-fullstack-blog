'use client'

import { useEffect, useState } from 'react'
import { isArticleCompleted, markArticleCompleted } from '@/lib/progress'

interface ArticleProgressProps {
  slug: string
  category: string
}

export default function ArticleProgress({ slug, category }: ArticleProgressProps) {
  const [isCompleted, setIsCompleted] = useState(false)
  const articleSlug = `${category}/${slug}`

  useEffect(() => {
    setIsCompleted(isArticleCompleted(articleSlug))
  }, [articleSlug])

  const handleToggleComplete = () => {
    if (!isCompleted) {
      markArticleCompleted(articleSlug)
      setIsCompleted(true)
    }
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
      <button
        onClick={handleToggleComplete}
        disabled={isCompleted}
        className={`
          flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all
          ${isCompleted
            ? 'bg-green-100 text-green-800 cursor-default'
            : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
          }
        `}
      >
        {isCompleted ? (
          <>
            <span className="text-2xl">✓</span>
            <span>已完成</span>
          </>
        ) : (
          <>
            <span className="text-2xl">○</span>
            <span>标记为已完成</span>
          </>
        )}
      </button>

      {isCompleted && (
        <p className="text-sm text-gray-600">
          太棒了！继续下一篇文章吧 🎉
        </p>
      )}
    </div>
  )
}
