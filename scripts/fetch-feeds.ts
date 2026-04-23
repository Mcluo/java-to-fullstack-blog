#!/usr/bin/env tsx
/**
 * 订阅源爬取脚本
 * 支持 RSS / B站 / YouTube 三种源类型
 *
 * 用法: npx tsx scripts/fetch-feeds.ts
 *       npm run fetch:feeds
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { parseStringPromise } from 'xml2js'

// ── Types ──────────────────────────────────────────

interface FeedSource {
  id: string
  name: string
  url: string
  feedUrl?: string
  type: 'rss' | 'website'
  platform?: string
  category: string
  enabled: boolean
  maxItems: number
  sourceType: 'rss' | 'bilibili' | 'youtube'
  channelId?: string
  lastFetched?: string
}

interface FeedItem {
  id: string
  sourceId: string
  title: string
  url: string
  thumbnail?: string
  duration?: string
  author: string
  publishedAt: string
  subtitle?: string
  summary?: string
  fetchedAt: string
  sourceType: 'rss' | 'bilibili' | 'youtube'
}

// ── Paths ──────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..')
const CONFIG_PATH = path.join(ROOT, 'content', 'feeds', 'config.json')
const ITEMS_PATH = path.join(ROOT, 'content', 'feeds', 'items.json')

// yt-dlp may be in agent-reach venv
const YTDLP = (() => {
  const venvPath = path.join(process.env.HOME || '', '.agent-reach-venv', 'bin', 'yt-dlp')
  if (fs.existsSync(venvPath)) return venvPath
  try { execSync('which yt-dlp', { encoding: 'utf8' }); return 'yt-dlp' } catch { return venvPath }
})()

// ── Helpers ────────────────────────────────────────

function loadConfig(): { version: number; feeds: FeedSource[] } {
  if (!fs.existsSync(CONFIG_PATH)) return { version: 1, feeds: [] }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
}

function loadItems(): FeedItem[] {
  if (!fs.existsSync(ITEMS_PATH)) return []
  return JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf8'))
}

function saveItems(items: FeedItem[]) {
  const dir = path.dirname(ITEMS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(ITEMS_PATH, JSON.stringify(items, null, 2) + '\n', 'utf8')
}

function saveConfig(config: { version: number; feeds: FeedSource[] }) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8')
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  // "20260412" → "2026-04-12"
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }
  return dateStr
}

// ── Fetchers ───────────────────────────────────────

async function fetchBilibili(source: FeedSource): Promise<FeedItem[]> {
  const items: FeedItem[] = []

  // Use bili CLI to search for user's videos (avoids space page auth)
  const biliCli = path.join(process.env.HOME || '', '.agent-reach-venv', 'bin', 'bili')

  try {
    const searchOutput = execSync(
      `"${biliCli}" search "${source.name}" --type video -n ${source.maxItems} --json 2>/dev/null`,
      { encoding: 'utf8', timeout: 30000 }
    )
    const result = JSON.parse(searchOutput)
    if (!result.ok || !result.data) {
      console.log('  [!] bili search 返回错误')
      return items
    }

    // Filter to only this author's videos
    const videos = result.data.filter((v: any) => {
      return v.author === source.name
    })

    console.log(`  找到 ${videos.length} 个视频 (搜索到 ${result.data.length} 条)`)

    for (const v of videos) {
      const videoUrl = `https://www.bilibili.com/video/${v.bvid}`

      // Try to get thumbnail + upload_date via yt-dlp single video
      let thumbnail: string | undefined
      let publishedAt = new Date().toISOString().slice(0, 10)
      try {
        const detail = execSync(
          `"${YTDLP}" --dump-json --skip-download "${videoUrl}" 2>/dev/null`,
          { encoding: 'utf8', timeout: 20000 }
        )
        const d = JSON.parse(detail)
        thumbnail = d.thumbnail
        if (d.upload_date) publishedAt = formatDate(d.upload_date)
      } catch {
        // Fallback: no thumbnail
      }

      items.push({
        id: `bili-${v.bvid}`,
        sourceId: source.id,
        title: v.title?.replace(/<[^>]*>/g, '') || '无标题',
        url: videoUrl,
        thumbnail,
        duration: v.duration || undefined,
        author: v.author || source.name,
        publishedAt,
        fetchedAt: new Date().toISOString(),
        sourceType: 'bilibili',
      })
    }
  } catch (err) {
    console.log(`  [!] 获取B站视频列表失败: ${(err as Error).message?.slice(0, 80)}`)
  }

  return items
}

async function fetchYouTube(source: FeedSource): Promise<FeedItem[]> {
  const channelUrl = source.url
  const items: FeedItem[] = []

  try {
    const listOutput = execSync(
      `"${YTDLP}" --dump-json --flat-playlist --playlist-items 1:${source.maxItems} "${channelUrl}/videos" 2>/dev/null`,
      { encoding: 'utf8', timeout: 60000 }
    )

    const videoUrls: string[] = []
    for (const line of listOutput.trim().split('\n')) {
      if (!line.trim()) continue
      try {
        const entry = JSON.parse(line)
        const url = entry.url || entry.webpage_url
        if (url) videoUrls.push(url.startsWith('http') ? url : `https://www.youtube.com/watch?v=${entry.id}`)
      } catch {}
    }

    console.log(`  找到 ${videoUrls.length} 个视频`)

    for (const videoUrl of videoUrls) {
      try {
        const detail = execSync(
          `"${YTDLP}" --dump-json --skip-download "${videoUrl}" 2>/dev/null`,
          { encoding: 'utf8', timeout: 30000 }
        )
        const d = JSON.parse(detail)

        items.push({
          id: `yt-${d.id}`,
          sourceId: source.id,
          title: d.title || '无标题',
          url: d.webpage_url || videoUrl,
          thumbnail: d.thumbnail || undefined,
          duration: d.duration ? formatDuration(d.duration) : undefined,
          author: d.uploader || d.channel || source.name,
          publishedAt: d.upload_date ? formatDate(d.upload_date) : new Date().toISOString().slice(0, 10),
          fetchedAt: new Date().toISOString(),
          sourceType: 'youtube',
        })
      } catch {
        console.log(`  [!] 获取视频详情失败: ${videoUrl}`)
      }
    }
  } catch (err) {
    console.log(`  [!] 获取 YouTube 视频列表失败: ${(err as Error).message?.slice(0, 80)}`)
  }

  return items
}

async function fetchRSS(source: FeedSource): Promise<FeedItem[]> {
  const feedUrl = source.feedUrl || source.url
  const items: FeedItem[] = []

  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'FeedReader/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    const xml = await res.text()
    const parsed = await parseStringPromise(xml, { explicitArray: false })

    // RSS 2.0
    const channel = parsed?.rss?.channel
    if (channel) {
      const entries = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : []
      for (const entry of entries.slice(0, source.maxItems)) {
        items.push({
          id: `rss-${Buffer.from(entry.link || entry.guid || entry.title).toString('base64').slice(0, 20)}`,
          sourceId: source.id,
          title: entry.title || '无标题',
          url: entry.link || '',
          author: entry.author || entry['dc:creator'] || channel.title || source.name,
          publishedAt: entry.pubDate ? new Date(entry.pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          fetchedAt: new Date().toISOString(),
          sourceType: 'rss',
        })
      }
      return items
    }

    // Atom
    const feed = parsed?.feed
    if (feed) {
      const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : []
      for (const entry of entries.slice(0, source.maxItems)) {
        const link = typeof entry.link === 'string' ? entry.link : entry.link?.$?.href || ''
        items.push({
          id: `rss-${Buffer.from(entry.id || link || entry.title).toString('base64').slice(0, 20)}`,
          sourceId: source.id,
          title: typeof entry.title === 'string' ? entry.title : entry.title?._ || '无标题',
          url: link,
          author: typeof entry.author === 'string' ? entry.author : entry.author?.name || feed.title || source.name,
          publishedAt: entry.published || entry.updated ? new Date(entry.published || entry.updated).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          fetchedAt: new Date().toISOString(),
          sourceType: 'rss',
        })
      }
    }
  } catch (err) {
    console.log(`  [!] RSS 抓取失败: ${(err as Error).message?.slice(0, 80)}`)
  }

  return items
}

// ── Utils ──────────────────────────────────────────

function extractBiliUid(url: string): string | null {
  // https://space.bilibili.com/489667127 or https://space.bilibili.com/489667127/video
  const m = url.match(/space\.bilibili\.com\/(\d+)/)
  if (m) return m[1]
  // 纯数字
  if (/^\d+$/.test(url)) return url
  return null
}

// ── Main ───────────────────────────────────────────

async function main() {
  console.log('📡 开始爬取订阅源...\n')

  const config = loadConfig()
  const enabledFeeds = config.feeds.filter(f => f.enabled)

  if (enabledFeeds.length === 0) {
    console.log('没有启用的订阅源。请先在 /feeds 页面添加订阅源。')
    return
  }

  const existingItems = loadItems()
  const existingUrls = new Set(existingItems.map(i => i.url))
  let totalNew = 0

  for (const source of enabledFeeds) {
    const type = source.sourceType || 'rss'
    console.log(`📥 [${type.toUpperCase()}] ${source.name} (${source.url})`)

    let newItems: FeedItem[] = []
    switch (type) {
      case 'bilibili':
        newItems = await fetchBilibili(source)
        break
      case 'youtube':
        newItems = await fetchYouTube(source)
        break
      case 'rss':
      default:
        newItems = await fetchRSS(source)
        break
    }

    // 去重
    const deduped = newItems.filter(item => !existingUrls.has(item.url))
    for (const item of deduped) existingUrls.add(item.url)

    console.log(`  ✅ 新增 ${deduped.length} 条 (共 ${newItems.length} 条)\n`)
    existingItems.push(...deduped)
    totalNew += deduped.length

    // 更新 lastFetched
    const idx = config.feeds.findIndex(f => f.id === source.id)
    if (idx !== -1) config.feeds[idx].lastFetched = new Date().toISOString()
  }

  // 按发布时间排序 (最新在前)
  existingItems.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  saveItems(existingItems)
  saveConfig(config)

  console.log(`\n✅ 爬取完成！新增 ${totalNew} 条，总计 ${existingItems.length} 条`)
  console.log(`📁 数据文件: content/feeds/items.json`)
}

main().catch(err => {
  console.error('爬取失败:', err)
  process.exit(1)
})
