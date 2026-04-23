import { NextRequest, NextResponse } from 'next/server'
import { loadFavorites, saveFavorites, type FeedFavorite } from '@/lib/feeds'

export async function GET() {
  return NextResponse.json(loadFavorites())
}

// Add to favorites
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, url, thumbnail, duration, author, summary, subtitle, sourceType, note } = body

  if (!title || !url) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 })
  }

  const favorites = loadFavorites()

  // Dedup by URL
  if (favorites.some(f => f.url === url)) {
    return NextResponse.json({ error: '已收藏' }, { status: 409 })
  }

  const item: FeedFavorite = {
    id: crypto.randomUUID(),
    title, url, thumbnail, duration, author,
    summary, subtitle,
    sourceType: sourceType || 'web',
    savedAt: new Date().toISOString(),
    note: note || undefined,
  }

  favorites.unshift(item)
  saveFavorites(favorites)
  return NextResponse.json(item, { status: 201 })
}

// Delete from favorites
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const favorites = loadFavorites()
  const filtered = favorites.filter(f => f.id !== id)
  if (filtered.length === favorites.length) {
    return NextResponse.json({ error: '未找到' }, { status: 404 })
  }
  saveFavorites(filtered)
  return NextResponse.json({ success: true })
}
