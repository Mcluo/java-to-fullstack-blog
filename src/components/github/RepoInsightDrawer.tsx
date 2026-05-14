'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GitHubRepo } from '@/lib/github'

interface RepoInsight {
  oneLiner: string
  problemSolved: string
  quickStart: string
  keyFeatures: string[]
  targetUser: string
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', 'C++': '#f34b7d',
  C: '#555555', 'C#': '#178600', Swift: '#F05138', Kotlin: '#A97BFF',
  Ruby: '#701516', PHP: '#4F5D95', Shell: '#89e051', Dart: '#00B4AB',
}

interface Props {
  repo: GitHubRepo | null
  onClose: () => void
}

export default function RepoInsightDrawer({ repo, onClose }: Props) {
  const [insight, setInsight] = useState<RepoInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchInsight = useCallback(async (r: GitHubRepo) => {
    setInsight(null)
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/github/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: r.full_name,
          description: r.description || '',
          topics: r.topics || [],
        }),
      })
      if (!res.ok) throw new Error('生成失败')
      setInsight(await res.json())
    } catch {
      setError('AI 解读暂时不可用，请直接查看 GitHub')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (repo) fetchInsight(repo)
  }, [repo, fetchInsight])

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function copyQuickStart() {
    if (!insight?.quickStart) return
    navigator.clipboard.writeText(insight.quickStart)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const open = !!repo

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {!repo ? null : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
              <img
                src={repo.owner.avatar_url}
                alt={repo.owner.login}
                className="w-10 h-10 rounded-lg flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-gray-900 leading-tight truncate">{repo.full_name}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {formatCount(repo.stargazers_count)}
                  </span>
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.language] || '#ccc' }} />
                      {repo.language}
                    </span>
                  )}
                  {repo.license && (
                    <span className="font-mono">{repo.license.spdx_id}</span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Original description */}
              {repo.description && (
                <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-3">{repo.description}</p>
              )}

              {/* AI insight */}
              {loading && (
                <div className="space-y-3 animate-pulse">
                  <div className="flex items-center gap-2 text-xs text-blue-500">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                    AI 正在解读这个项目...
                  </div>
                  {[80, 60, 90, 70].map((w, i) => (
                    <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}

              {error && (
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">{error}</div>
              )}

              {insight && (
                <div className="space-y-4">
                  {/* Layer 1: 5秒看懂 */}
                  <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                    <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">快速看懂</p>
                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        <span className="text-base leading-none mt-0.5">💡</span>
                        <div>
                          <p className="text-[10px] text-blue-400 font-medium mb-0.5">是什么</p>
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{insight.oneLiner}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-base leading-none mt-0.5">🎯</span>
                        <div>
                          <p className="text-[10px] text-blue-400 font-medium mb-0.5">解决什么问题</p>
                          <p className="text-sm text-gray-700 leading-snug">{insight.problemSolved}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-base leading-none mt-0.5">👤</span>
                        <div>
                          <p className="text-[10px] text-blue-400 font-medium mb-0.5">适合谁</p>
                          <p className="text-sm text-gray-700 leading-snug">{insight.targetUser}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Layer 2: 上手方式 */}
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">怎么用</p>
                    <div className="bg-gray-900 rounded-xl px-4 py-3 relative group">
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all leading-relaxed">{insight.quickStart}</pre>
                      <button
                        onClick={copyQuickStart}
                        className="absolute top-2 right-2 px-2 py-1 text-[10px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition opacity-0 group-hover:opacity-100"
                      >
                        {copied ? '已复制' : '复制'}
                      </button>
                    </div>
                  </div>

                  {/* Layer 3: 核心特性 */}
                  {insight.keyFeatures.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">核心特性</p>
                      <ul className="space-y-1.5">
                        {insight.keyFeatures.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-blue-400 font-bold mt-0.5 shrink-0">·</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Topics */}
                  {repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {repo.topics.slice(0, 8).map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <a
                href={`${repo.html_url}#readme`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl text-center transition"
              >
                查看 README
              </a>
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl text-center transition flex items-center justify-center gap-1.5"
              >
                去 GitHub
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>
    </>
  )
}
