'use client'

import Link from 'next/link'

interface ArticleTagsProps {
  tags: string[]
}

export default function ArticleTags({ tags }: ArticleTagsProps) {
  if (!tags || tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag: string, i: number) => (
        <Link
          key={i}
          href={`/articles?tag=${encodeURIComponent(tag)}`}
          className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
        >
          #{tag}
        </Link>
      ))}
    </div>
  )
}
