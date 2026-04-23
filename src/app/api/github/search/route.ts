import { NextRequest, NextResponse } from 'next/server'
import { searchGitHub, searchMultipleQueries, PRESET_TOPICS } from '@/lib/github'
import type { SearchParams, PresetTopic } from '@/lib/github'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams

  const q = sp.get('q')?.trim()
  const preset = sp.get('preset')?.trim()
  const customQueries = sp.get('queries')?.trim() // 自定义榜单：JSON 数组

  // 自定义榜单模式（前端传入 queries JSON）
  if (customQueries) {
    try {
      const queries: string[] = JSON.parse(customQueries)
      if (!Array.isArray(queries) || queries.length === 0) {
        return NextResponse.json({ error: 'queries must be a non-empty array' }, { status: 400 })
      }
      const sort = (sp.get('sort') as PresetTopic['sort']) || 'stars'
      const data = await searchMultipleQueries(
        queries, sort,
        Number(sp.get('per_page')) || 30,
        Number(sp.get('page')) || 1,
      )
      return NextResponse.json(data)
    } catch (err) {
      if (err instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid queries JSON' }, { status: 400 })
      }
      console.error('GitHub custom queries error:', err)
      return NextResponse.json({ error: 'GitHub API request failed' }, { status: 502 })
    }
  }

  // 预设榜单模式（多查询合并）
  if (preset) {
    const topic = PRESET_TOPICS.find(t => t.key === preset)
    if (!topic) {
      return NextResponse.json({ error: `Unknown preset: ${preset}` }, { status: 400 })
    }
    try {
      const data = await searchMultipleQueries(
        topic.queries, topic.sort,
        Number(sp.get('per_page')) || 30,
        Number(sp.get('page')) || 1,
      )
      return NextResponse.json(data)
    } catch (err) {
      console.error('GitHub preset search error:', err)
      return NextResponse.json({ error: 'GitHub API request failed' }, { status: 502 })
    }
  }

  // 自由搜索模式
  if (!q) {
    return NextResponse.json({ error: 'Missing q, preset, or queries parameter' }, { status: 400 })
  }

  const params: SearchParams = {
    q,
    language: sp.get('language') || undefined,
    sort: (sp.get('sort') as SearchParams['sort']) || 'stars',
    order: (sp.get('order') as 'desc' | 'asc') || 'desc',
    min_stars: sp.get('min_stars') ? Number(sp.get('min_stars')) : undefined,
    topic: sp.get('topic') || undefined,
    per_page: Number(sp.get('per_page')) || 30,
    page: Number(sp.get('page')) || 1,
    created_after: sp.get('created_after') || undefined,
  }

  try {
    const data = await searchGitHub(params)
    return NextResponse.json(data)
  } catch (err) {
    console.error('GitHub search error:', err)
    return NextResponse.json({ error: 'GitHub API request failed' }, { status: 502 })
  }
}
