import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { ArticleMeta } from './articles'

export interface FeedSource {
  id: string
  name: string
  url: string          // 用户输入的原始 URL
  feedUrl?: string     // 自动发现的 RSS URL (type=rss 时)
  type: 'rss' | 'website'  // rss=标准RSS, website=HTML抓取
  platform?: string    // 识别到的平台名
  category: string
  enabled: boolean
  maxItems: number
  sourceType: 'rss' | 'bilibili' | 'youtube'  // 源类型
  channelId?: string    // B站 UID 或 YouTube channel ID
  lastFetched?: string  // 上次爬取时间 ISO string
}

export interface FeedItem {
  id: string
  sourceId: string       // 关联 FeedSource.id
  title: string
  url: string
  thumbnail?: string
  duration?: string      // 视频时长 (如 "12:34")
  author: string
  publishedAt: string
  subtitle?: string      // 字幕/正文内容
  summary?: string       // AI 总结
  userInsights?: string[] // 用户追问后提炼的洞见
  fetchedAt: string      // 爬取时间 ISO string
  sourceType: 'rss' | 'bilibili' | 'youtube'
}

export interface FeedConfig {
  version: number
  feeds: FeedSource[]
}

const FEEDS_CONFIG_PATH = path.join(process.cwd(), 'content', 'feeds', 'config.json')
const FEEDS_ITEMS_PATH = path.join(process.cwd(), 'content', 'feeds', 'items.json')
const FEEDS_ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles', 'feeds')

export function loadFeedConfig(): FeedConfig {
  if (!fs.existsSync(FEEDS_CONFIG_PATH)) {
    return { version: 1, feeds: [] }
  }
  return JSON.parse(fs.readFileSync(FEEDS_CONFIG_PATH, 'utf8'))
}

export function saveFeedConfig(config: FeedConfig): void {
  const tmpPath = FEEDS_CONFIG_PATH + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2) + '\n', 'utf8')
  fs.renameSync(tmpPath, FEEDS_CONFIG_PATH)
}

export function getFeedDigests(): ArticleMeta[] {
  if (!fs.existsSync(FEEDS_ARTICLES_DIR)) return []

  const files = fs.readdirSync(FEEDS_ARTICLES_DIR).filter(f => f.endsWith('.md'))
  const digests: ArticleMeta[] = []

  for (const file of files) {
    const slug = file.replace(/\.md$/, '')
    const filePath = path.join(FEEDS_ARTICLES_DIR, file)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data } = matter(fileContents)

    digests.push({
      title: data.title || slug,
      excerpt: data.excerpt || '',
      category: 'feeds',
      slug,
      tags: data.tags || [],
      readTime: data.readTime,
      publishedAt: data.publishedAt,
      updatedAt: data.updatedAt,
    })
  }

  digests.sort((a, b) => {
    const dateA = a.publishedAt || '1970-01-01'
    const dateB = b.publishedAt || '1970-01-01'
    return dateB.localeCompare(dateA)
  })

  return digests
}

// ── Quick Summary History ──────────────────────────

export interface QuickSummaryRecord {
  id: string
  url: string
  videoUrl?: string
  title: string
  summary: string
  subtitle?: string
  platform: 'bilibili' | 'youtube' | 'xiaohongshu' | 'web'
  summarizedAt: string
}

const QUICK_HISTORY_PATH = path.join(process.cwd(), 'content', 'feeds', 'quick-history.json')

export function loadQuickHistory(): QuickSummaryRecord[] {
  if (!fs.existsSync(QUICK_HISTORY_PATH)) return []
  return JSON.parse(fs.readFileSync(QUICK_HISTORY_PATH, 'utf8'))
}

export function saveQuickHistory(items: QuickSummaryRecord[]): void {
  const dir = path.dirname(QUICK_HISTORY_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tmpPath = QUICK_HISTORY_PATH + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2) + '\n', 'utf8')
  fs.renameSync(tmpPath, QUICK_HISTORY_PATH)
}

// ── Favorites ──────────────────────────────────────

export interface FeedFavorite {
  id: string
  title: string
  url: string
  thumbnail?: string
  duration?: string
  author: string
  summary?: string
  subtitle?: string
  sourceType: 'bilibili' | 'youtube' | 'rss' | 'web'
  savedAt: string
  tags?: string[]
  note?: string           // 用户备注
  userInsights?: string[] // 用户追问后提炼的洞见
}

const FEEDS_FAVORITES_PATH = path.join(process.cwd(), 'content', 'feeds', 'favorites.json')

export function loadFavorites(): FeedFavorite[] {
  if (!fs.existsSync(FEEDS_FAVORITES_PATH)) return []
  return JSON.parse(fs.readFileSync(FEEDS_FAVORITES_PATH, 'utf8'))
}

export function saveFavorites(items: FeedFavorite[]): void {
  const dir = path.dirname(FEEDS_FAVORITES_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tmpPath = FEEDS_FAVORITES_PATH + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2) + '\n', 'utf8')
  fs.renameSync(tmpPath, FEEDS_FAVORITES_PATH)
}

// ── Feed Items ─────────────────────────────────────

export function loadFeedItems(): FeedItem[] {
  if (!fs.existsSync(FEEDS_ITEMS_PATH)) return []
  return JSON.parse(fs.readFileSync(FEEDS_ITEMS_PATH, 'utf8'))
}

export function saveFeedItems(items: FeedItem[]): void {
  const dir = path.dirname(FEEDS_ITEMS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tmpPath = FEEDS_ITEMS_PATH + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2) + '\n', 'utf8')
  fs.renameSync(tmpPath, FEEDS_ITEMS_PATH)
}
