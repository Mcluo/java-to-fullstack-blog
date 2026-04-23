import { NextRequest, NextResponse } from 'next/server'
import { loadFeedItems, saveFeedItems, loadFeedConfig } from '@/lib/feeds'

// Delete item
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const items = loadFeedItems()
  const filtered = items.filter(i => i.id !== id)
  if (filtered.length === items.length) {
    return NextResponse.json({ error: '未找到' }, { status: 404 })
  }
  saveFeedItems(filtered)
  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sourceId = searchParams.get('sourceId')
  const sourceType = searchParams.get('sourceType')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let items = loadFeedItems()

  if (sourceId) items = items.filter(i => i.sourceId === sourceId)
  if (sourceType) items = items.filter(i => i.sourceType === sourceType)

  const total = items.length
  items = items.slice(offset, offset + limit)

  // Attach source name for display
  const config = loadFeedConfig()
  const sourceMap = new Map(config.feeds.map(f => [f.id, f.name]))
  const enriched = items.map(item => ({
    ...item,
    sourceName: sourceMap.get(item.sourceId) || '未知源',
  }))

  return NextResponse.json({ items: enriched, total })
}
