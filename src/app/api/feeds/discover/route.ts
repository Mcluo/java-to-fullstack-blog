import { NextRequest, NextResponse } from 'next/server'
import { discoverFeed } from '@/lib/feed-discovery'

export async function POST(request: NextRequest) {
  const { url } = await request.json()

  if (!url) {
    return NextResponse.json({ error: '请输入 URL' }, { status: 400 })
  }

  try {
    const result = await discoverFeed(url)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { error: `发现失败: ${err.message}` },
      { status: 500 }
    )
  }
}
