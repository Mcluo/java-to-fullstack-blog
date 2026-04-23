// GitHub Search API 封装 + 内存缓存 + 多查询合并

export interface GitHubRepo {
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
}

export interface GitHubSearchResult {
  total_count: number
  items: GitHubRepo[]
  incomplete_results: boolean
}

export interface SearchParams {
  q: string
  language?: string
  sort?: 'stars' | 'forks' | 'updated' | 'best-match'
  order?: 'desc' | 'asc'
  min_stars?: number
  topic?: string
  per_page?: number
  page?: number
  created_after?: string // YYYY-MM-DD
}

// --- 预设榜单（多子查询） ---

export interface PresetTopic {
  key: string
  label: string
  queries: string[]  // 多个子查询，并行请求后合并
  sort: 'stars' | 'forks' | 'updated'
  builtin?: boolean  // 是否内置
}

export const PRESET_TOPICS: PresetTopic[] = [
  {
    key: 'all', label: '总榜', builtin: true,
    queries: ['stars:>50000'],
    sort: 'stars',
  },
  {
    key: 'ai', label: 'AI/ML', builtin: true,
    queries: [
      'topic:machine-learning stars:>5000',
      'topic:deep-learning stars:>5000',
      'topic:llm stars:>3000',
      'topic:artificial-intelligence stars:>5000',
    ],
    sort: 'stars',
  },
  {
    key: 'frontend', label: '前端', builtin: true,
    queries: [
      'topic:react stars:>5000',
      'topic:vue stars:>5000',
      'topic:angular stars:>3000',
      'topic:nextjs stars:>3000',
      'topic:svelte stars:>3000',
    ],
    sort: 'stars',
  },
  {
    key: 'backend', label: '后端', builtin: true,
    queries: [
      'topic:nodejs stars:>5000',
      'topic:golang stars:>3000',
      'topic:rust stars:>3000',
      'topic:python stars:>10000',
      'topic:java stars:>10000',
    ],
    sort: 'stars',
  },
  {
    key: 'devops', label: 'DevOps', builtin: true,
    queries: [
      'topic:docker stars:>5000',
      'topic:kubernetes stars:>5000',
      'topic:ci-cd stars:>3000',
      'topic:terraform stars:>3000',
    ],
    sort: 'stars',
  },
  {
    key: 'database', label: '数据库', builtin: true,
    queries: [
      'topic:database stars:>5000',
      'topic:sql stars:>5000',
      'topic:redis stars:>3000',
      'topic:postgresql stars:>3000',
    ],
    sort: 'stars',
  },
  {
    key: 'tools', label: '工具', builtin: true,
    queries: [
      'topic:developer-tools stars:>5000',
      'topic:cli stars:>5000',
      'topic:terminal stars:>3000',
      'topic:vscode stars:>3000',
    ],
    sort: 'stars',
  },
  {
    key: 'rising', label: '年度新星', builtin: true,
    queries: ['stars:>1000 created:>2025-06-01'],
    sort: 'stars',
  },
]

// --- 缓存 ---

const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const cache = new Map<string, { data: GitHubSearchResult; timestamp: number }>()

function getCacheKey(params: SearchParams): string {
  return JSON.stringify(params)
}

// --- 单次 API 调用 ---

export async function searchGitHub(params: SearchParams): Promise<GitHubSearchResult> {
  const cacheKey = getCacheKey(params)
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // 构建查询字符串
  let q = params.q
  if (params.language) {
    q += ` language:${params.language}`
  }
  if (params.min_stars) {
    q += ` stars:>=${params.min_stars}`
  }
  if (params.topic) {
    q += ` topic:${params.topic}`
  }
  if (params.created_after) {
    q += ` created:>${params.created_after}`
  }

  const searchParams = new URLSearchParams({
    q,
    sort: params.sort === 'best-match' ? '' : (params.sort || 'stars'),
    order: params.order || 'desc',
    per_page: String(params.per_page || 30),
    page: String(params.page || 1),
  })

  if (!searchParams.get('sort')) {
    searchParams.delete('sort')
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(
    `https://api.github.com/search/repositories?${searchParams}`,
    { headers, next: { revalidate: 3600 } }
  )

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${errBody}`)
  }

  const data: GitHubSearchResult = await res.json()

  cache.set(cacheKey, { data, timestamp: Date.now() })

  // 限制缓存大小
  if (cache.size > 200) {
    const oldest = Array.from(cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 50)
    for (const [key] of oldest) {
      cache.delete(key)
    }
  }

  return data
}

// --- 多查询合并（预设榜单用） ---

export async function searchMultipleQueries(
  queries: string[],
  sort: 'stars' | 'forks' | 'updated',
  perPage: number = 30,
  page: number = 1,
): Promise<GitHubSearchResult> {
  // 合并缓存 key
  const mergedKey = `multi:${JSON.stringify({ queries, sort, perPage, page })}`
  const cached = cache.get(mergedKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // 并行请求所有子查询（每个取 perPage 条）
  const results = await Promise.allSettled(
    queries.map(q =>
      searchGitHub({ q, sort, order: 'desc', per_page: perPage, page })
    )
  )

  // 合并 + 去重（按 repo id）
  const seen = new Set<number>()
  const allItems: GitHubRepo[] = []
  let totalCount = 0

  for (const result of results) {
    if (result.status === 'fulfilled') {
      totalCount += result.value.total_count
      for (const repo of result.value.items) {
        if (!seen.has(repo.id)) {
          seen.add(repo.id)
          allItems.push(repo)
        }
      }
    }
  }

  // 按 sort 字段重新排序
  const sortKey = sort === 'forks' ? 'forks_count'
    : sort === 'updated' ? 'pushed_at'
    : 'stargazers_count'

  allItems.sort((a, b) => {
    if (sortKey === 'pushed_at') {
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
    }
    return (b[sortKey] as number) - (a[sortKey] as number)
  })

  // 分页裁切（因为合并后可能超出 perPage）
  const paged = allItems.slice(0, perPage)

  const data: GitHubSearchResult = {
    total_count: totalCount,
    items: paged,
    incomplete_results: false,
  }

  cache.set(mergedKey, { data, timestamp: Date.now() })
  return data
}

// --- 语言列表（常用） ---

export const POPULAR_LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Java', 'Go',
  'Rust', 'C++', 'C', 'C#', 'Swift', 'Kotlin', 'Ruby',
  'PHP', 'Shell', 'Dart', 'Scala', 'Lua', 'Zig',
]
