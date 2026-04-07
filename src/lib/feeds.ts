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
}

export interface FeedConfig {
  version: number
  feeds: FeedSource[]
}

const FEEDS_CONFIG_PATH = path.join(process.cwd(), 'content', 'feeds', 'config.json')
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
