'use client'

import { useEffect, useState } from 'react'

interface Chunk {
  text: string
  score: number
  metadata: {
    source: 'article' | 'note'
    title: string
    category: string
    slug: string
    filePath?: string
  }
}

interface Props {
  title: string
  excerpt?: string
  currentSlug: string // "category/slug"
}

export default function RelatedKnowledge({ title, excerpt, currentSlug }: Props) {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/related-knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, excerpt, currentSlug }),
    })
      .then(r => r.json())
      .then(data => setChunks(data.chunks || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [title, excerpt, currentSlug])

  if (loading) {
    return (
      <div className="mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">相关知识</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (chunks.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        相关知识
      </h3>
      <div className="space-y-2">
        {chunks.map((chunk, i) => {
          const isNote = chunk.metadata.source === 'note'
          const href = isNote
            ? undefined
            : `/articles/${chunk.metadata.category}/${chunk.metadata.slug}`
          const label = isNote ? '笔记' : '文章'
          const labelColor = isNote
            ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100'
            : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'

          const content = (
            <div className={`group rounded-lg border border-gray-100 p-3 transition-colors ${href ? 'hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer' : 'bg-gray-50/50'}`}>
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${labelColor}`}>
                  {label}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors">
                    {chunk.metadata.title}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                    {chunk.text.slice(0, 100)}…
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-end">
                <div className="flex items-center gap-1">
                  <div className="h-1 rounded-full bg-gray-200 w-16 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${Math.round(chunk.score * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{Math.round(chunk.score * 100)}%</span>
                </div>
              </div>
            </div>
          )

          return href ? (
            <a key={i} href={href}>
              {content}
            </a>
          ) : (
            <div key={i}>{content}</div>
          )
        })}
      </div>
    </div>
  )
}
