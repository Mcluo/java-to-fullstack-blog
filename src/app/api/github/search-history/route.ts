import { NextRequest, NextResponse } from 'next/server'
import { loadSearchHistory, saveSearchHistory, type SearchHistoryItem } from '@/lib/github-search-history'

export async function GET() {
  return NextResponse.json(loadSearchHistory())
}

// Add a query to history (dedup + cap at 20)
export async function POST(request: NextRequest) {
  const { query } = await request.json()
  if (!query?.trim()) return NextResponse.json({ error: '缺少 query' }, { status: 400 })

  const q = query.trim()
  const history = loadSearchHistory().filter(h => h.query !== q)
  const item: SearchHistoryItem = { query: q, searchedAt: new Date().toISOString() }
  saveSearchHistory([item, ...history].slice(0, 20))
  return NextResponse.json(item, { status: 201 })
}

// Delete one item by query
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  if (!query) return NextResponse.json({ error: '缺少 query' }, { status: 400 })

  const history = loadSearchHistory().filter(h => h.query !== query)
  saveSearchHistory(history)
  return NextResponse.json({ success: true })
}
