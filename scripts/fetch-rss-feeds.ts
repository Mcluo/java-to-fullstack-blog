/**
 * 每日 RSS 订阅源拉取 + AI 智能摘要生成
 *
 * 用法: bun run fetch:feeds
 *
 * 流程:
 * 1. 读取 content/feeds/config.json
 * 2. 拉取所有启用的 RSS 源
 * 3. 用 Claude 生成中文智能摘要
 * 4. 输出 content/articles/feeds/YYYY-MM-DD.md
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { XMLParser } from 'fast-xml-parser'

// --- 类型定义 ---

interface FeedSource {
  id: string
  name: string
  url: string
  feedUrl?: string
  type: 'rss' | 'website'
  category: string
  enabled: boolean
  maxItems: number
}

interface FeedConfig {
  version: number
  feeds: FeedSource[]
}

interface FeedItem {
  title: string
  link: string
  description: string
  pubDate: string
  sourceName: string
  sourceCategory: string
}

// --- 路径 ---

const ROOT_DIR = path.resolve(import.meta.dir, '..')
const CONFIG_PATH = path.join(ROOT_DIR, 'content', 'feeds', 'config.json')
const OUTPUT_DIR = path.join(ROOT_DIR, 'content', 'articles', 'feeds')

// --- RSS 解析 ---

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function parseRSSItems(xml: string, source: FeedSource): FeedItem[] {
  const parsed = xmlParser.parse(xml)
  const items: FeedItem[] = []

  // RSS 2.0
  const rssItems = parsed?.rss?.channel?.item
  if (rssItems) {
    const list = Array.isArray(rssItems) ? rssItems : [rssItems]
    for (const item of list.slice(0, source.maxItems)) {
      items.push({
        title: item.title || '无标题',
        link: item.link || '',
        description: stripHtml(item.description || item['content:encoded'] || '').slice(0, 300),
        pubDate: item.pubDate || '',
        sourceName: source.name,
        sourceCategory: source.category,
      })
    }
    return items
  }

  // Atom
  const atomEntries = parsed?.feed?.entry
  if (atomEntries) {
    const list = Array.isArray(atomEntries) ? atomEntries : [atomEntries]
    for (const entry of list.slice(0, source.maxItems)) {
      const link = Array.isArray(entry.link)
        ? entry.link.find((l: any) => l['@_rel'] === 'alternate')?.['@_href'] || entry.link[0]?.['@_href'] || ''
        : entry.link?.['@_href'] || entry.link || ''
      items.push({
        title: entry.title || '无标题',
        link,
        description: stripHtml(entry.summary || entry.content || '').slice(0, 300),
        pubDate: entry.published || entry.updated || '',
        sourceName: source.name,
        sourceCategory: source.category,
      })
    }
    return items
  }

  console.warn(`[feeds] 无法解析 ${source.name} 的 RSS 格式`)
  return items
}

// --- HTML 抓取 (website 类型) ---

function scrapeArticlesFromHtml(html: string, source: FeedSource): FeedItem[] {
  const items: FeedItem[] = []
  const seen = new Set<string>()

  const anchorRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const articlePatterns = [
    /\/(?:post|article|blog|p|archives|entry|writing|note)s?\/[^"'\s]+/gi,
    /\/\d{4}\/\d{2}\/[^"'\s]+/gi,
    /\/post\/\d+/gi,
  ]

  let match
  while ((match = anchorRegex.exec(html)) !== null) {
    let href = match[1]
    const text = match[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

    if (text.length < 5 || text.length > 200) continue

    const skipWords = ['登录', '注册', '首页', '关于', 'login', 'signup', 'about', 'contact', 'home']
    if (skipWords.some(w => text.toLowerCase().includes(w) && text.length < 20)) continue

    if (href.startsWith('/')) {
      try { href = new URL(href, source.url).href } catch { continue }
    } else if (!href.startsWith('http')) {
      try { href = new URL(href, source.url).href } catch { continue }
    }

    if (seen.has(href)) continue
    seen.add(href)

    const isArticleLike = articlePatterns.some(p => { p.lastIndex = 0; return p.test(href) }) || text.length > 15

    if (isArticleLike) {
      items.push({
        title: text,
        link: href,
        description: '',
        pubDate: '',
        sourceName: source.name,
        sourceCategory: source.category,
      })
    }
  }

  return items.slice(0, source.maxItems)
}

async function fetchFeed(source: FeedSource): Promise<FeedItem[]> {
  try {
    // 确定实际要拉取的 URL
    const fetchUrl = (source.type === 'rss' && source.feedUrl) ? source.feedUrl : source.url
    const mode = source.type || 'rss'

    console.log(`[feeds] 拉取: ${source.name} (${fetchUrl}) [${mode}]`)
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': mode === 'website'
          ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          : 'JavaFullstackBlog/1.0 RSS Reader',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      console.error(`[feeds] ${source.name} 返回 ${res.status}`)
      return []
    }
    const body = await res.text()

    if (mode === 'website') {
      return scrapeArticlesFromHtml(body, source)
    }
    return parseRSSItems(body, source)
  } catch (err: any) {
    console.error(`[feeds] ${source.name} 拉取失败: ${err.message}`)
    return []
  }
}

// --- AI 摘要 ---

async function generateSummary(items: FeedItem[]): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
  })

  // 按分类分组
  const grouped: Record<string, FeedItem[]> = {}
  for (const item of items) {
    const cat = item.sourceCategory || '未分类'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  // 构建 prompt
  let feedContent = ''
  for (const [category, categoryItems] of Object.entries(grouped)) {
    feedContent += `\n## ${category}\n\n`
    for (const item of categoryItems) {
      feedContent += `### ${item.title}\n`
      feedContent += `- 来源: ${item.sourceName}\n`
      feedContent += `- 链接: ${item.link}\n`
      if (item.description) feedContent += `- 摘要: ${item.description}\n`
      feedContent += '\n'
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  const response = await anthropic.messages.create({
    model: process.env.CHAT_MODEL || 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `你是一位技术资讯编辑，负责编写每日技术日报。请根据以下 RSS 订阅源的最新内容，生成一份简洁、有深度的中文技术日报。

要求：
1. 开头写 2-3 句今日概览，总结今日重点
2. 按分类组织内容，每个分类下的每篇文章包含：
   - 一句话中文总结（不超过50字）
   - 2-3 个关键要点（每个不超过30字）
   - 原文链接
3. 结尾写一段"编辑推荐"，挑选1-2篇最值得深读的文章并说明原因
4. 总字数控制在 2000 字以内
5. 直接输出 Markdown 正文内容，不要包含 frontmatter

今日日期: ${today}

以下是今日的 RSS 内容：
${feedContent}`,
      },
    ],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  return textBlock?.text || '暂无内容'
}

// --- 主流程 ---

async function main() {
  const today = new Date().toISOString().slice(0, 10)
  const outputPath = path.join(OUTPUT_DIR, `${today}.md`)

  // 幂等性检查
  if (fs.existsSync(outputPath)) {
    console.log(`[feeds] 今日日报已存在: ${outputPath}，跳过`)
    process.exit(0)
  }

  // 读取配置
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('[feeds] 配置文件不存在: content/feeds/config.json')
    process.exit(1)
  }

  const config: FeedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  const enabledFeeds = config.feeds.filter(f => f.enabled)

  if (enabledFeeds.length === 0) {
    console.log('[feeds] 没有启用的订阅源，退出')
    process.exit(0)
  }

  console.log(`[feeds] 共 ${enabledFeeds.length} 个启用的订阅源`)

  // 并发拉取
  const results = await Promise.all(enabledFeeds.map(fetchFeed))
  const allItems = results.flat()

  if (allItems.length === 0) {
    console.log('[feeds] 没有获取到任何内容，退出')
    process.exit(0)
  }

  console.log(`[feeds] 共获取 ${allItems.length} 条内容，正在生成 AI 摘要...`)

  // AI 摘要
  const summary = await generateSummary(allItems)

  // 收集所有出现的分类标签
  const categories = [...new Set(allItems.map(i => i.sourceCategory))]
  const sourceNames = [...new Set(allItems.map(i => i.sourceName))]

  // 生成 frontmatter
  const readTime = Math.max(3, Math.ceil(summary.length / 400))
  const frontmatter = `---
title: "订阅日报 ${today}"
excerpt: "今日 ${allItems.length} 篇来自 ${sourceNames.length} 个源的技术资讯精选"
category: "feeds"
tags: ${JSON.stringify(['日报', 'RSS', ...categories])}
publishedAt: "${today}"
readTime: ${readTime}
---

`

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // 写入文件
  fs.writeFileSync(outputPath, frontmatter + summary, 'utf8')
  console.log(`[feeds] 日报已生成: ${outputPath}`)
}

main().catch(err => {
  console.error('[feeds] 致命错误:', err)
  process.exit(1)
})
