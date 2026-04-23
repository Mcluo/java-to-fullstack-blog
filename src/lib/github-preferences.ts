// GitHub 用户偏好管理 - 类型定义 + localStorage 工具

export interface GitHubPreferences {
  interests: string[]
  languages: string[]
  focus: ('trending' | 'new' | 'underrated')[]
  minStars: number
  keywords: string[]
  lastRecommendedAt?: string
}

export interface RecommendedRepo {
  id: number
  full_name: string
  name: string
  owner: { login: string; avatar_url: string }
  html_url: string
  description: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
  topics: string[]
  created_at: string
  updated_at: string
  pushed_at: string
  license: { spdx_id: string } | null
  homepage: string | null
  // AI 推荐扩展字段
  recommendation?: {
    reason: string
    summary: string
    matchedInterests: string[]
  }
}

export interface RecommendationCache {
  repos: RecommendedRepo[]
  timestamp: number
  preferencesHash: string
}

// 预设兴趣领域
export const INTEREST_PRESETS = [
  'AI/ML', 'LLM/Agent', '前端', '后端', 'DevOps',
  '数据库', '云原生', '安全', '游戏开发', '移动端',
  '区块链', '数据科学', '嵌入式', '工具/CLI',
  '低代码', '可视化', '测试', '微服务',
]

// 关注维度描述
export const FOCUS_OPTIONS = [
  { key: 'trending' as const, label: '热门趋势', desc: '近期 Star 增长快的项目' },
  { key: 'new' as const, label: '新兴项目', desc: '近 6 个月内创建的潜力项目' },
  { key: 'underrated' as const, label: '冷门精品', desc: 'Star 不多但质量高的项目' },
]

const PREFERENCES_KEY = 'github-preferences'
const CACHE_KEY = 'github-recommendations-cache'
const DISMISSED_KEY = 'github-dismissed-repos'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 小时

export const DEFAULT_PREFERENCES: GitHubPreferences = {
  interests: [],
  languages: [],
  focus: ['trending'],
  minStars: 100,
  keywords: [],
}

// --- localStorage 工具 ---

export function loadPreferences(): GitHubPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(prefs: GitHubPreferences): void {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
}

export function hasPreferences(): boolean {
  const prefs = loadPreferences()
  return prefs.interests.length > 0 || prefs.keywords.length > 0
}

// 偏好哈希（用于判断缓存是否失效）
function hashPreferences(prefs: GitHubPreferences): string {
  return JSON.stringify({
    interests: prefs.interests.sort(),
    languages: prefs.languages.sort(),
    focus: prefs.focus.sort(),
    minStars: prefs.minStars,
    keywords: prefs.keywords.sort(),
  })
}

// 推荐缓存
export function loadRecommendationCache(prefs: GitHubPreferences): RecommendedRepo[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache: RecommendationCache = JSON.parse(raw)
    if (Date.now() - cache.timestamp > CACHE_TTL) return null
    if (cache.preferencesHash !== hashPreferences(prefs)) return null
    return cache.repos
  } catch {
    return null
  }
}

export function saveRecommendationCache(repos: RecommendedRepo[], prefs: GitHubPreferences): void {
  const cache: RecommendationCache = {
    repos,
    timestamp: Date.now(),
    preferencesHash: hashPreferences(prefs),
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export function clearRecommendationCache(): void {
  localStorage.removeItem(CACHE_KEY)
}

// 不感兴趣列表
export function loadDismissedRepos(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function dismissRepo(repoId: number): void {
  const dismissed = loadDismissedRepos()
  if (!dismissed.includes(repoId)) {
    dismissed.push(repoId)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
  }
}

export function undismissRepo(repoId: number): void {
  const dismissed = loadDismissedRepos().filter(id => id !== repoId)
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
}

// 根据偏好生成 GitHub 搜索查询
export function buildQueriesFromPreferences(prefs: GitHubPreferences): string[] {
  const queries: string[] = []
  const minStars = prefs.minStars || 100

  // 兴趣领域映射到 GitHub topic 搜索
  const interestTopicMap: Record<string, string[]> = {
    'AI/ML': ['machine-learning', 'deep-learning', 'artificial-intelligence'],
    'LLM/Agent': ['llm', 'ai-agent', 'langchain', 'rag'],
    '前端': ['react', 'vue', 'nextjs', 'frontend'],
    '后端': ['backend', 'api', 'microservices'],
    'DevOps': ['docker', 'kubernetes', 'ci-cd', 'devops'],
    '数据库': ['database', 'sql', 'nosql'],
    '云原生': ['cloud-native', 'serverless', 'kubernetes'],
    '安全': ['security', 'cybersecurity', 'penetration-testing'],
    '游戏开发': ['game-development', 'game-engine', 'unity'],
    '移动端': ['android', 'ios', 'react-native', 'flutter'],
    '区块链': ['blockchain', 'web3', 'solidity'],
    '数据科学': ['data-science', 'data-analysis', 'pandas'],
    '嵌入式': ['embedded', 'iot', 'arduino', 'raspberry-pi'],
    '工具/CLI': ['cli', 'developer-tools', 'terminal'],
    '低代码': ['low-code', 'no-code', 'form-builder'],
    '可视化': ['data-visualization', 'chart', 'd3'],
    '测试': ['testing', 'test-framework', 'automation-testing'],
    '微服务': ['microservices', 'grpc', 'service-mesh'],
  }

  // 从兴趣领域生成查询
  for (const interest of prefs.interests) {
    const topics = interestTopicMap[interest]
    if (topics) {
      for (const topic of topics.slice(0, 2)) {
        queries.push(`topic:${topic} stars:>=${minStars}`)
      }
    }
  }

  // 从自定义关键词生成查询
  for (const kw of prefs.keywords) {
    queries.push(`${kw} in:name,description stars:>=${minStars}`)
  }

  // 新兴项目筛选
  if (prefs.focus.includes('new')) {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const dateStr = sixMonthsAgo.toISOString().slice(0, 10)
    // 为每个兴趣领域添加时间限制查询
    for (const interest of prefs.interests.slice(0, 3)) {
      const topics = interestTopicMap[interest]
      if (topics) {
        queries.push(`topic:${topics[0]} created:>${dateStr} stars:>=${Math.min(minStars, 500)}`)
      }
    }
  }

  // 冷门精品
  if (prefs.focus.includes('underrated')) {
    for (const interest of prefs.interests.slice(0, 3)) {
      const topics = interestTopicMap[interest]
      if (topics) {
        queries.push(`topic:${topics[0]} stars:${Math.max(50, minStars / 2)}..${Math.max(500, minStars * 2)}`)
      }
    }
  }

  // 语言过滤（附加到查询中）
  if (prefs.languages.length > 0 && queries.length > 0) {
    // 为部分查询添加语言限制
    const langQueries: string[] = []
    for (const q of queries.slice(0, 5)) {
      for (const lang of prefs.languages.slice(0, 2)) {
        langQueries.push(`${q} language:${lang}`)
      }
    }
    queries.push(...langQueries)
  }

  // 去重并限制数量
  return [...new Set(queries)].slice(0, 15)
}
