import { NextRequest, NextResponse } from 'next/server'
import { loadFeedConfig, saveFeedConfig, type FeedSource } from '@/lib/feeds'

function readOnly() {
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: '生产环境为只读，请在本地开发环境管理订阅源' },
      { status: 503 }
    )
  }
  return null
}

export async function GET() {
  const config = loadFeedConfig()
  return NextResponse.json(config)
}

export async function POST(request: NextRequest) {
  const guard = readOnly()
  if (guard) return guard

  const body = await request.json()
  const { name, url, category, maxItems, type, feedUrl, platform } = body

  if (!name || !url) {
    return NextResponse.json({ error: '名称和 URL 为必填' }, { status: 400 })
  }

  const config = loadFeedConfig()
  const newFeed: FeedSource = {
    id: crypto.randomUUID(),
    name,
    url,
    feedUrl: feedUrl || undefined,
    type: type || 'rss',
    platform: platform || undefined,
    category: category || '未分类',
    enabled: true,
    maxItems: maxItems || 10,
  }

  config.feeds.push(newFeed)
  saveFeedConfig(config)

  return NextResponse.json(newFeed, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const guard = readOnly()
  if (guard) return guard

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const config = loadFeedConfig()
  const index = config.feeds.findIndex(f => f.id === id)
  if (index === -1) {
    return NextResponse.json({ error: '未找到该订阅源' }, { status: 404 })
  }

  config.feeds[index] = { ...config.feeds[index], ...updates }
  saveFeedConfig(config)

  return NextResponse.json(config.feeds[index])
}

export async function DELETE(request: NextRequest) {
  const guard = readOnly()
  if (guard) return guard

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 })
  }

  const config = loadFeedConfig()
  config.feeds = config.feeds.filter(f => f.id !== id)
  saveFeedConfig(config)

  return NextResponse.json({ success: true })
}
