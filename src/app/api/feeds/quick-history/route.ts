import { NextRequest, NextResponse } from 'next/server'
import { loadQuickHistory, saveQuickHistory } from '@/lib/feeds'

export async function GET() {
  return NextResponse.json(loadQuickHistory())
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const history = loadQuickHistory()
  const filtered = history.filter(r => r.id !== id)
  if (filtered.length === history.length) {
    return NextResponse.json({ error: '未找到' }, { status: 404 })
  }
  saveQuickHistory(filtered)
  return NextResponse.json({ success: true })
}
