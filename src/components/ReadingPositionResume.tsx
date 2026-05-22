'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  articleSlug: string
}

interface SavedPosition {
  headingId: string
  headingText: string
  scrollY: number
  timestamp: number
}

const STORAGE_PREFIX = 'reading_pos_'

export default function ReadingPositionResume({ articleSlug }: Props) {
  const [savedPosition, setSavedPosition] = useState<SavedPosition | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const storageKey = `${STORAGE_PREFIX}${articleSlug}`

  // 加载保存的位置
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const pos: SavedPosition = JSON.parse(raw)
        // 只显示24小时内的记录
        if (Date.now() - pos.timestamp < 24 * 60 * 60 * 1000) {
          setSavedPosition(pos)
        } else {
          localStorage.removeItem(storageKey)
        }
      }
    } catch {}
  }, [storageKey])

  // 记录阅读位置（节流）
  const savePosition = useCallback(() => {
    const headings = document.querySelectorAll('#article-content h2[id], #article-content h3[id]')
    if (headings.length === 0) return

    const scrollY = window.scrollY
    let currentHeading: Element | null = null

    for (const h of headings) {
      const rect = h.getBoundingClientRect()
      if (rect.top <= 150) {
        currentHeading = h
      } else {
        break
      }
    }

    if (currentHeading && scrollY > 300) {
      const pos: SavedPosition = {
        headingId: currentHeading.id,
        headingText: currentHeading.textContent?.slice(0, 30) || '',
        scrollY,
        timestamp: Date.now(),
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(pos))
      } catch {}
    }
  }, [storageKey])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(savePosition, 1000)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timer)
    }
  }, [savePosition])

  function resumeReading() {
    if (!savedPosition) return
    const el = document.getElementById(savedPosition.headingId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: savedPosition.scrollY, behavior: 'smooth' })
    }
    setDismissed(true)
  }

  function dismiss() {
    setDismissed(true)
    localStorage.removeItem(storageKey)
  }

  // 不显示的条件：没有保存位置、已关闭、页面刚打开还在顶部
  if (!savedPosition || dismissed) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-full shadow-lg">
        <span className="text-sm text-gray-600">
          上次读到 <span className="font-medium text-gray-900">「{savedPosition.headingText}」</span>
        </span>
        <button
          onClick={resumeReading}
          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition"
        >
          继续阅读
        </button>
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
