'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import RecommendationCard from './RecommendationCard'
import SkeletonCard from './SkeletonCard'
import {
  type GitHubPreferences,
  type RecommendedRepo,
  loadPreferences,
  hasPreferences,
  loadRecommendationCache,
  saveRecommendationCache,
  clearRecommendationCache,
  loadDismissedRepos,
  dismissRepo,
  buildQueriesFromPreferences,
} from '@/lib/github-preferences'

interface Props {
  active: boolean
  onOpenPreferences: () => void
}

export default function RecommendationTab({ active, onOpenPreferences }: Props) {
  const [repos, setRepos] = useState<RecommendedRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPrefs, setHasPrefs] = useState(false)
  const fetchedRef = useRef(false)

  // 检查偏好是否存在
  useEffect(() => {
    setHasPrefs(hasPreferences())
  }, [active])

  // 获取推荐
  const fetchRecommendations = useCallback(async (skipCache = false) => {
    const prefs = loadPreferences()
    if (!prefs.interests.length && !prefs.keywords.length) {
      setHasPrefs(false)
      return
    }
    setHasPrefs(true)

    // 检查缓存
    if (!skipCache) {
      const cached = loadRecommendationCache(prefs)
      if (cached) {
        setRepos(cached)
        return
      }
    }

    setLoading(true)
    setAiLoading(false)
    setError(null)
    setRepos([])

    try {
      const queries = buildQueriesFromPreferences(prefs)
      const dismissed = loadDismissedRepos()

      const res = await fetch('/api/github/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries,
          interests: prefs.interests,
          languages: prefs.languages,
          keywords: prefs.keywords,
          dismissed,
        }),
      })

      if (!res.ok) {
        throw new Error(`请求失败 (${res.status})`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let baseRepos: RecommendedRepo[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue

          try {
            const event = JSON.parse(payload)

            if (event.type === 'repos') {
              baseRepos = event.data as RecommendedRepo[]
              setRepos(baseRepos)
              setLoading(false)
              setAiLoading(true)
            }

            if (event.type === 'recommendations') {
              const recs = event.data as Array<{
                index: number
                reason: string
                summary: string
                matchedInterests: string[]
              }>

              const enriched = baseRepos.map((repo, idx) => {
                const rec = recs.find(r => r.index === idx)
                if (rec) {
                  return {
                    ...repo,
                    recommendation: {
                      reason: rec.reason,
                      summary: rec.summary,
                      matchedInterests: rec.matchedInterests,
                    },
                  }
                }
                return repo
              })

              setRepos(enriched)
              saveRecommendationCache(enriched, prefs)
              setAiLoading(false)
            }

            if (event.type === 'error') {
              setAiLoading(false)
            }
          } catch {
            // ignore parse errors for partial data
          }
        }
      }

      setLoading(false)
      setAiLoading(false)
    } catch (err) {
      setLoading(false)
      setAiLoading(false)
      setError(err instanceof Error ? err.message : '获取推荐失败')
    }
  }, [])

  // 当 tab 激活时获取推荐
  useEffect(() => {
    if (active && !fetchedRef.current) {
      fetchedRef.current = true
      fetchRecommendations()
    }
  }, [active, fetchRecommendations])

  // 偏好更新后重新获取
  const handlePreferencesUpdated = useCallback(() => {
    fetchedRef.current = true
    clearRecommendationCache()
    fetchRecommendations(true)
  }, [fetchRecommendations])

  // 暴露给父组件
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__refreshRecommendations = handlePreferencesUpdated
    }
    return () => {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).__refreshRecommendations
      }
    }
  }, [handlePreferencesUpdated])

  const handleDismiss = (repoId: number) => {
    dismissRepo(repoId)
    setRepos(prev => prev.filter(r => r.id !== repoId))
  }

  const handleRefresh = () => {
    clearRecommendationCache()
    fetchRecommendations(true)
  }

  if (!active) return null

  // 没有配置偏好
  if (!hasPrefs && !loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">设置你的兴趣偏好</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          告诉我你关注的技术领域和编程语言，我会根据你的偏好推荐最匹配的 GitHub 项目
        </p>
        <button
          onClick={onOpenPreferences}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          配置偏好
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {repos.length > 0 && !loading && (
              <>基于你的偏好推荐了 <strong className="text-gray-700">{repos.length}</strong> 个项目</>
            )}
          </span>
          {aiLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              AI 正在分析推荐理由...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPreferences}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            修改偏好
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading || aiLoading}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 inline-block mr-1 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新推荐
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && repos.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Results */}
      {repos.length > 0 && (
        <div className="space-y-3">
          {repos.map(repo => (
            <RecommendationCard
              key={repo.id}
              repo={repo}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {/* Empty after dismiss */}
      {!loading && repos.length === 0 && hasPrefs && !error && (
        <div className="py-16 text-center text-gray-400">
          <p>暂无更多推荐，试试刷新或调整偏好</p>
        </div>
      )}
    </div>
  )
}
