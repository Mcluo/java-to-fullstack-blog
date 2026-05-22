'use client'

import { useState } from 'react'

interface Props {
  keyPoints: string[]
}

export default function ArticleKeyPoints({ keyPoints }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  if (!keyPoints || keyPoints.length === 0) return null

  return (
    <div className="mb-8 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/60 to-yellow-50/60 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50/50 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">TL;DR</span>
          <span className="text-xs text-amber-700 font-medium">核心要点</span>
        </div>
        <svg
          className={`w-4 h-4 text-amber-500 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4">
          <ul className="space-y-1.5">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
