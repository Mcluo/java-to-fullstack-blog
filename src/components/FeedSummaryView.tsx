'use client'

import { useState } from 'react'

interface Chapter {
  timestamp: string
  title: string
  summary: string
  keyPoints: string[]
}

interface StructuredSummary {
  overview: string
  chapters: Chapter[]
  takeaway: string
}

function parseVideoUrl(url: string, timestamp: string): string {
  // Convert "MM:SS" to seconds for B站/YouTube jump
  const parts = timestamp.split(':')
  const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0')

  if (url.includes('bilibili.com')) {
    return `${url}?t=${seconds}`
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}t=${seconds}`
  }
  return url
}

function parseSummary(summary: string): StructuredSummary | null {
  try {
    const data = JSON.parse(summary)
    if (data.overview && data.chapters) return data as StructuredSummary
  } catch {}
  return null
}

export default function FeedSummaryView({
  summary,
  subtitle,
  videoUrl,
}: {
  summary: string
  subtitle?: string
  videoUrl: string
}) {
  const [tab, setTab] = useState<'summary' | 'outline' | 'transcript'>('summary')
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null)

  const structured = parseSummary(summary)

  // If not structured JSON, show as plain text
  if (!structured) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 border-b border-gray-100 pb-2">
          <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>总结</TabButton>
          {subtitle && <TabButton active={tab === 'transcript'} onClick={() => setTab('transcript')}>原文</TabButton>}
        </div>
        {tab === 'summary' ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{summary}</div>
        ) : (
          <div className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto font-mono">{subtitle}</div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-2">
        <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          章节总结
        </TabButton>
        <TabButton active={tab === 'outline'} onClick={() => setTab('outline')}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          大纲
        </TabButton>
        {subtitle && (
          <TabButton active={tab === 'transcript'} onClick={() => setTab('transcript')}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            原文转录
          </TabButton>
        )}
      </div>

      {/* Overview */}
      {tab !== 'transcript' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg px-4 py-3">
          <div className="text-xs text-blue-500 font-medium mb-1">概述</div>
          <div className="text-sm text-gray-800 font-medium">{structured.overview}</div>
        </div>
      )}

      {/* Tab: Summary — chapter cards */}
      {tab === 'summary' && (
        <div className="space-y-2">
          {structured.chapters.map((ch, i) => (
            <div key={i} className="border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition">
              {/* Chapter header */}
              <button
                onClick={() => setExpandedChapter(expandedChapter === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
              >
                <a
                  href={parseVideoUrl(videoUrl, ch.timestamp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="shrink-0 px-2 py-0.5 text-xs font-mono text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition"
                >
                  {ch.timestamp}
                </a>
                <span className="flex-1 text-sm font-medium text-gray-900">{ch.title}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedChapter === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Chapter body */}
              {expandedChapter === i && (
                <div className="px-4 pb-3 space-y-2">
                  <p className="text-sm text-gray-600 leading-relaxed">{ch.summary}</p>
                  {ch.keyPoints.length > 0 && (
                    <ul className="space-y-1">
                      {ch.keyPoints.map((kp, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-gray-500">
                          <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                          <span>{kp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Outline — compact tree view */}
      {tab === 'outline' && (
        <div className="space-y-1 pl-1">
          {structured.chapters.map((ch, i) => (
            <div key={i} className="group">
              <div className="flex items-center gap-2 py-1">
                <a
                  href={parseVideoUrl(videoUrl, ch.timestamp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-blue-500 hover:text-blue-700 shrink-0"
                >
                  {ch.timestamp}
                </a>
                <span className="text-sm text-gray-800 font-medium">{ch.title}</span>
              </div>
              <div className="ml-12 space-y-0.5 pb-1">
                {ch.keyPoints.map((kp, j) => (
                  <div key={j} className="flex items-start gap-1.5 text-xs text-gray-500">
                    <span className="text-gray-300 shrink-0">└</span>
                    <span>{kp}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Transcript — raw text with timestamps */}
      {tab === 'transcript' && subtitle && (
        <div className="max-h-96 overflow-y-auto rounded-lg bg-gray-50 p-3">
          <div className="space-y-2">
            {subtitle.split('\n').filter(l => l.trim()).map((line, i) => {
              const tsMatch = line.match(/^\[(\d{2}:\d{2})\]\s*(.*)/)
              if (tsMatch) {
                return (
                  <div key={i} className="flex gap-2">
                    <a
                      href={parseVideoUrl(videoUrl, tsMatch[1])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[11px] font-mono text-blue-500 hover:text-blue-700 pt-0.5"
                    >
                      {tsMatch[1]}
                    </a>
                    <span className="text-xs text-gray-600 leading-relaxed">{tsMatch[2]}</span>
                  </div>
                )
              }
              return <div key={i} className="text-xs text-gray-600 leading-relaxed">{line}</div>
            })}
          </div>
        </div>
      )}

      {/* Takeaway */}
      {tab !== 'transcript' && structured.takeaway && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5">
          <div className="text-xs text-amber-600 font-medium mb-0.5">推荐理由</div>
          <div className="text-sm text-gray-700">{structured.takeaway}</div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition ${
        active
          ? 'bg-gray-900 text-white'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}
