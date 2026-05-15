import { NextRequest, NextResponse } from 'next/server'
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

const DATA_PATH = path.join(process.cwd(), 'content', 'feeds', 'hn-daily.json')
const REPO = 'borq168/big_model_radar'
const API_URL = `https://api.github.com/repos/${REPO}/issues`

function loadBuiltInItems(): HnDailyItem[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
  } catch {
    return []
  }
}

function cleanBody(body: string): string {
  return body.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

async function fetchFromGitHub(): Promise<HnDailyItem[]> {
  const params = new URLSearchParams({
    labels: 'hn',
    state: 'all',
    per_page: '30',
    sort: 'created',
    direction: 'desc',
  })

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'JavaFullstackBlog/1.0',
  }

  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers.Authorization = `token ${token}`
  }

  const res = await fetch(`${API_URL}?${params}`, { headers })
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }

  const issues = await res.json()

  return issues.map((issue: any) => {
    const dateMatch = issue.title.match(/(\d{4}-\d{2}-\d{2})/)
    const date = dateMatch
      ? dateMatch[1]
      : new Date(issue.created_at).toISOString().slice(0, 10)

    return {
      id: issue.number,
      title: issue.title,
      body: cleanBody(issue.body || ''),
      date,
      url: issue.html_url,
      fetchedAt: new Date().toISOString(),
    }
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '30')
  const offset = parseInt(searchParams.get('offset') || '0')

  const all = loadBuiltInItems()
  const items = all.slice(offset, offset + limit)

  return NextResponse.json({ items, total: all.length })
}

export async function POST() {
  try {
    const freshItems = await fetchFromGitHub()
    const builtIn = loadBuiltInItems()

    // Merge: fresh items take priority, then fill with built-in
    const seen = new Set<number>()
    const merged: HnDailyItem[] = []

    for (const item of freshItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        merged.push(item)
      }
    }
    for (const item of builtIn) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        merged.push(item)
      }
    }

    merged.sort((a, b) => b.date.localeCompare(a.date))

    // Try to persist (works locally, fails silently on Vercel)
    try {
      const tmpPath = DATA_PATH + '.tmp'
      fs.writeFileSync(tmpPath, JSON.stringify(merged, null, 2))
      fs.renameSync(tmpPath, DATA_PATH)
    } catch {
      // Read-only filesystem on Vercel — that's fine
    }

    const newCount = freshItems.filter(
      fi => !builtIn.some(bi => bi.id === fi.id)
    ).length

    return NextResponse.json({
      success: true,
      items: merged,
      total: merged.length,
      newItems: newCount,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `拉取失败: ${err.message?.slice(0, 200)}` },
      { status: 500 }
    )
  }
}
