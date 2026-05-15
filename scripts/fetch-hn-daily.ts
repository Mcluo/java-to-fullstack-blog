#!/usr/bin/env tsx
/**
 * Hacker News AI 日报获取脚本
 * 从 borq168/big_model_radar GitHub Issues 拉取带 hn 标签的日报
 *
 * 用法: npx tsx scripts/fetch-hn-daily.ts
 *       npm run fetch:hn
 */

import fs from 'fs'
import path from 'path'

interface HnDailyItem {
  id: number
  title: string
  body: string
  date: string
  url: string
  fetchedAt: string
}

const ROOT = path.resolve(__dirname, '..')
const DATA_PATH = path.join(ROOT, 'content', 'feeds', 'hn-daily.json')
const REPO = 'borq168/big_model_radar'
const API_URL = `https://api.github.com/repos/${REPO}/issues`

function loadExisting(): HnDailyItem[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
  } catch {
    return []
  }
}

function cleanBody(body: string): string {
  // Remove <think>...</think> blocks (LLM reasoning artifacts)
  return body.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

async function fetchIssues(page = 1): Promise<any[]> {
  const params = new URLSearchParams({
    labels: 'hn',
    state: 'all',
    per_page: '30',
    sort: 'created',
    direction: 'desc',
    page: String(page),
  })

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'JavaFullstackBlog/1.0',
  }

  // Use GITHUB_TOKEN if available for higher rate limit
  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers.Authorization = `token ${token}`
  }

  const res = await fetch(`${API_URL}?${params}`, { headers })

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

async function main() {
  console.log('📰 开始拉取 Hacker News AI 日报...')

  const existing = loadExisting()
  const existingIds = new Set(existing.map(item => item.id))
  console.log(`  已有 ${existing.length} 条日报`)

  const issues = await fetchIssues()
  console.log(`  从 GitHub 获取 ${issues.length} 条 issues`)

  let newCount = 0
  const newItems: HnDailyItem[] = []

  for (const issue of issues) {
    if (existingIds.has(issue.number)) continue

    // Extract date from title like "📰 Hacker News AI 社区动态日报 2026-04-26"
    const dateMatch = issue.title.match(/(\d{4}-\d{2}-\d{2})/)
    const date = dateMatch
      ? dateMatch[1]
      : new Date(issue.created_at).toISOString().slice(0, 10)

    newItems.push({
      id: issue.number,
      title: issue.title,
      body: cleanBody(issue.body || ''),
      date,
      url: issue.html_url,
      fetchedAt: new Date().toISOString(),
    })
    newCount++
  }

  // Merge and sort by date desc
  const all = [...newItems, ...existing].sort(
    (a, b) => b.date.localeCompare(a.date)
  )

  // Atomic write
  const tmpPath = DATA_PATH + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(all, null, 2))
  fs.renameSync(tmpPath, DATA_PATH)

  console.log(`✅ 新增 ${newCount} 条，总计 ${all.length} 条日报`)
}

main().catch(err => {
  console.error('❌ 拉取失败:', err.message)
  process.exit(1)
})
