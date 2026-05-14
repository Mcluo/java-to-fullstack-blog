'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import GitHubRepoCard from '@/components/github/GitHubRepoCard'
import GitHubTopicTabs from '@/components/github/GitHubTopicTabs'
import GitHubFilters, { type FilterValues } from '@/components/github/GitHubFilters'
import CustomTopicModal from '@/components/github/CustomTopicModal'
import PreferencesPanel from '@/components/github/PreferencesPanel'
import RecommendationTab from '@/components/github/RecommendationTab'
import RepoInsightDrawer from '@/components/github/RepoInsightDrawer'
import type { CustomTopic } from '@/components/github/GitHubTopicTabs'
import type { GitHubRepo } from '@/lib/github'
import type { GitHubPreferences } from '@/lib/github-preferences'
import { PRESET_TOPICS } from '@/lib/github'

const CUSTOM_TOPICS_KEY = 'github-custom-topics'

function loadCustomTopics(): CustomTopic[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_TOPICS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCustomTopics(topics: CustomTopic[]) {
  localStorage.setItem(CUSTOM_TOPICS_KEY, JSON.stringify(topics))
}

interface SearchState {
  repos: GitHubRepo[]
  total: number
  loading: boolean
  error: string | null
  page: number
  hasMore: boolean
}

export default function GitHubPage() {
  const [query, setQuery] = useState('')
  const [activePreset, setActivePreset] = useState('all')
  const [mode, setMode] = useState<'preset' | 'search' | 'custom'>('preset')
  const [filters, setFilters] = useState<FilterValues>({
    language: '',
    sort: 'stars',
    min_stars: '',
  })
  const [state, setState] = useState<SearchState>({
    repos: [],
    total: 0,
    loading: false,
    error: null,
    page: 1,
    hasMore: false,
  })
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [recommendationMode, setRecommendationMode] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const fetchIdRef = useRef(0)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  // 加载自定义榜单
  useEffect(() => {
    setCustomTopics(loadCustomTopics())
  }, [])

  // Load search history from backend
  useEffect(() => {
    fetch('/api/github/search-history')
      .then(r => r.json())
      .then((data: { query: string }[]) => setSearchHistory(data.map(d => d.query)))
      .catch(() => {})
  }, [])

  // Close history dropdown on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchRepos = useCallback(async (params: {
    q?: string
    preset?: string
    customQueries?: string[]
    page?: number
    append?: boolean
  }) => {
    const currentId = ++fetchIdRef.current

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      ...(params.append ? {} : { repos: [], page: 1 }),
    }))

    try {
      const sp = new URLSearchParams()

      if (params.customQueries) {
        sp.set('queries', JSON.stringify(params.customQueries))
      } else if (params.preset) {
        sp.set('preset', params.preset)
      } else if (params.q) {
        sp.set('q', params.q)
        if (filters.language) sp.set('language', filters.language)
        if (filters.min_stars) sp.set('min_stars', filters.min_stars)
      }

      sp.set('sort', filters.sort)
      sp.set('per_page', '30')
      sp.set('page', String(params.page || 1))

      const res = await fetch(`/api/github/search?${sp}`)

      if (currentId !== fetchIdRef.current) return

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `请求失败 (${res.status})`)
      }

      const data = await res.json()

      if (currentId !== fetchIdRef.current) return

      setState(prev => ({
        repos: params.append ? [...prev.repos, ...data.items] : data.items,
        total: data.total_count,
        loading: false,
        error: null,
        page: params.page || 1,
        hasMore: (data.items?.length || 0) === 30,
      }))
    } catch (err: unknown) {
      if (currentId !== fetchIdRef.current) return
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : '未知错误',
      }))
    }
  }, [filters])

  // 初次加载
  useEffect(() => {
    fetchRepos({ preset: 'all' })
    return () => { fetchIdRef.current++ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 切换到推荐模式
  const handleRecommendation = () => {
    setRecommendationMode(true)
    setActivePreset('')
  }

  // 切换榜单（内置 or 自定义）
  const handleTopicSelect = (key: string) => {
    setRecommendationMode(false)
    setActivePreset(key)
    setQuery('')

    // 检查是否是自定义榜单
    const custom = customTopics.find(t => t.key === key)
    if (custom) {
      setMode('custom')
      fetchRepos({ customQueries: custom.queries })
    } else {
      setMode('preset')
      fetchRepos({ preset: key })
    }
  }

  // 偏好保存回调
  const handlePreferencesSave = (_prefs: GitHubPreferences) => {
    setRecommendationMode(true)
    setActivePreset('')
    // 触发推荐刷新
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshFn = (window as any).__refreshRecommendations
    if (typeof refreshFn === 'function') {
      refreshFn()
    }
  }

  // 搜索提交
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setShowHistory(false)
    setRecommendationMode(false)
    const q = query.trim()
    if (!q) {
      setMode('preset')
      fetchRepos({ preset: activePreset })
      return
    }
    setMode('search')
    fetchRepos({ q })
    // Save to backend history
    fetch('/api/github/search-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    }).then(() => setSearchHistory(prev => [q, ...prev.filter(h => h !== q)].slice(0, 20))).catch(() => {})
  }

  function handleSelectHistory(q: string) {
    setQuery(q)
    setShowHistory(false)
    setRecommendationMode(false)
    setMode('search')
    fetchRepos({ q })
  }

  function handleDeleteHistory(q: string) {
    fetch(`/api/github/search-history?query=${encodeURIComponent(q)}`, { method: 'DELETE' }).catch(() => {})
    setSearchHistory(prev => prev.filter(h => h !== q))
  }

  // 筛选变更
  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters)
    setTimeout(() => {
      if (mode === 'search' && query.trim()) {
        fetchRepos({ q: query.trim() })
      } else if (mode === 'custom') {
        const custom = customTopics.find(t => t.key === activePreset)
        if (custom) fetchRepos({ customQueries: custom.queries })
      } else {
        fetchRepos({ preset: activePreset })
      }
    }, 0)
  }

  // 加载更多
  const loadMore = () => {
    const nextPage = state.page + 1
    if (mode === 'search') {
      fetchRepos({ q: query.trim(), page: nextPage, append: true })
    } else if (mode === 'custom') {
      const custom = customTopics.find(t => t.key === activePreset)
      if (custom) fetchRepos({ customQueries: custom.queries, page: nextPage, append: true })
    } else {
      fetchRepos({ preset: activePreset, page: nextPage, append: true })
    }
  }

  // 保存自定义榜单
  const handleSaveCustomTopics = (topics: CustomTopic[]) => {
    setCustomTopics(topics)
    saveCustomTopics(topics)
  }

  // 当前选中的榜单名
  const activeLabel = mode === 'custom'
    ? customTopics.find(t => t.key === activePreset)?.label
    : PRESET_TOPICS.find(t => t.key === activePreset)?.label

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          GitHub 搜索引擎
        </h1>
        <p className="mt-2 text-gray-500">
          搜索 GitHub 仓库，浏览各领域 Star 排行榜，支持自定义榜单
        </p>
      </div>

      {/* 搜索栏 */}
      <div ref={searchBoxRef} className="relative mb-6">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
              placeholder="搜索仓库... 例如: react state management"
              className="w-full px-4 py-3 pl-12 pr-24 text-gray-900 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition text-base"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              搜索
            </button>
          </div>
        </form>

        {/* 搜索历史下拉 */}
        {showHistory && searchHistory.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
            <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
              <span className="text-xs text-gray-400 font-medium">搜索历史</span>
              <button
                onClick={() => {
                  searchHistory.forEach(q => fetch(`/api/github/search-history?query=${encodeURIComponent(q)}`, { method: 'DELETE' }).catch(() => {}))
                  setSearchHistory([])
                  setShowHistory(false)
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition"
              >
                清空
              </button>
            </div>
            {searchHistory.map(q => (
              <div key={q} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 group">
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <button
                  className="flex-1 text-left text-sm text-gray-700 truncate"
                  onClick={() => handleSelectHistory(q)}
                >
                  {q}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteHistory(q) }}
                  className="shrink-0 text-gray-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 主题标签 */}
      <div className="mb-4">
        <GitHubTopicTabs
          activeKey={!recommendationMode && mode !== 'search' ? activePreset : ''}
          customTopics={customTopics}
          onSelect={handleTopicSelect}
          onManage={() => setShowModal(true)}
          recommendationActive={recommendationMode}
          onRecommendation={handleRecommendation}
        />
      </div>

      {/* 筛选 (非推荐模式下显示) */}
      {!recommendationMode && (
        <div className="mb-6">
          <GitHubFilters filters={filters} onChange={handleFilterChange} />
        </div>
      )}

      {/* 推荐模式 */}
      <RecommendationTab
        active={recommendationMode}
        onOpenPreferences={() => setShowPreferences(true)}
        onSelectRepo={repo => setSelectedRepo(repo as GitHubRepo)}
      />

      {/* 结果统计 (非推荐模式) */}
      {!recommendationMode && !state.loading && state.total > 0 && (
        <div className="mb-4 text-sm text-gray-500">
          {mode === 'search' ? (
            <>搜索 &ldquo;{query}&rdquo; 找到 <strong className="text-gray-700">{state.total.toLocaleString()}</strong> 个仓库</>
          ) : (
            <><strong className="text-gray-700">{activeLabel}</strong> 榜单 &middot; 共 <strong className="text-gray-700">{state.total.toLocaleString()}</strong> 个仓库</>
          )}
        </div>
      )}

      {/* 错误 */}
      {!recommendationMode && state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* 加载中 */}
      {!recommendationMode && state.loading && state.repos.length === 0 && (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-500">搜索中...</p>
        </div>
      )}

      {/* 结果列表 */}
      {!recommendationMode && state.repos.length > 0 && (
        <div className="space-y-3">
          {state.repos.map((repo, idx) => (
            <GitHubRepoCard
              key={`${repo.id}-${idx}`}
              repo={repo}
              rank={mode !== 'search' ? (state.page - 1) * 30 + idx + 1 : undefined}
              onSelect={setSelectedRepo}
            />
          ))}
        </div>
      )}

      {/* 无结果 */}
      {!recommendationMode && !state.loading && state.repos.length === 0 && !state.error && mode === 'search' && (
        <div className="py-20 text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p>没有找到匹配的仓库</p>
        </div>
      )}

      {/* 加载更多 */}
      {!recommendationMode && state.hasMore && !state.loading && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
          >
            加载更多
          </button>
        </div>
      )}

      {!recommendationMode && state.loading && state.repos.length > 0 && (
        <div className="mt-6 text-center">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 自定义榜单管理弹窗 */}
      <CustomTopicModal
        open={showModal}
        topics={customTopics}
        onClose={() => setShowModal(false)}
        onSave={handleSaveCustomTopics}
      />

      {/* 偏好设置弹窗 */}
      <PreferencesPanel
        open={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={handlePreferencesSave}
      />

      {/* Repo Insight 抽屉 */}
      <RepoInsightDrawer
        repo={selectedRepo}
        onClose={() => setSelectedRepo(null)}
      />
    </div>
  )
}
