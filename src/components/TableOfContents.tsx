'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'

interface TocItem {
  id: string
  text: string
  level: number
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function extractHeadings(content: string): TocItem[] {
  const headings: TocItem[] = []
  const lines = content.split('\n')
  let inCodeBlock = false

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].replace(/[*_`~\[\]]/g, '').trim()
      headings.push({ id: slugify(text), text, level })
    }
  }

  return headings
}

export default function TableOfContents({ content }: { content: string }) {
  const [activeId, setActiveId] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())

  const headings = useMemo(() => extractHeadings(content), [content])

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track active heading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -75% 0px' }
    )

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[]
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [headings])

  // Move the active indicator
  useEffect(() => {
    if (!activeId || !indicatorRef.current) return
    const activeEl = itemRefs.current.get(activeId)
    if (activeEl) {
      const container = indicatorRef.current.parentElement
      if (container) {
        const containerRect = container.getBoundingClientRect()
        const activeRect = activeEl.getBoundingClientRect()
        indicatorRef.current.style.top = `${activeRect.top - containerRect.top}px`
        indicatorRef.current.style.height = `${activeRect.height}px`
        indicatorRef.current.style.opacity = '1'
      }
    }
  }, [activeId])

  const handleClick = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
      setActiveId(id)
    }
  }, [])

  if (headings.length === 0) return null

  const activeIndex = headings.findIndex((h) => h.id === activeId)
  const progressText = activeIndex >= 0
    ? `${activeIndex + 1} / ${headings.length}`
    : `${headings.length} sections`

  return (
    <nav className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          On this page
        </h4>
        <span className="text-[11px] tabular-nums text-gray-300 font-medium">
          {progressText}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-gray-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* TOC list */}
      <div className="relative">
        {/* Animated active indicator */}
        <div
          ref={indicatorRef}
          className="absolute left-0 w-[2px] bg-blue-500 rounded-full transition-all duration-200 ease-out opacity-0"
        />
        {/* Track line */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gray-100 rounded-full" />

        <ul className="space-y-[2px]">
          {headings.map((heading) => {
            const isActive = activeId === heading.id
            return (
              <li key={heading.id}>
                <a
                  ref={(el) => {
                    if (el) itemRefs.current.set(heading.id, el)
                  }}
                  href={`#${heading.id}`}
                  onClick={(e) => handleClick(e, heading.id)}
                  className={`
                    block py-1.5 text-[13px] leading-snug transition-all duration-200 rounded-r-md
                    ${heading.level === 3 ? 'pl-7' : 'pl-4'}
                    ${
                      isActive
                        ? 'text-blue-600 font-medium bg-blue-50/60'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }
                  `}
                  title={heading.text}
                >
                  <span className={heading.level === 3 ? '' : ''}>
                    {heading.text.length > 24
                      ? heading.text.slice(0, 22) + '...'
                      : heading.text}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Back to top */}
      {progress > 0.15 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-5 flex items-center gap-1.5 text-[12px] text-gray-300 hover:text-gray-500 transition-colors duration-200 group"
        >
          <svg
            className="w-3 h-3 transition-transform duration-200 group-hover:-translate-y-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          Back to top
        </button>
      )}
    </nav>
  )
}
