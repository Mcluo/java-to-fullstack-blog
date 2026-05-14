import { NextRequest, NextResponse } from 'next/server'
import { searchRelevantChunks, isRagAvailable } from '@/lib/rag'

export async function POST(req: NextRequest) {
  if (!isRagAvailable()) {
    return NextResponse.json({ chunks: [] })
  }

  const { title, excerpt, currentSlug } = await req.json()
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  // 用文章标题 + 摘要作为查询，召回相关知识
  const query = excerpt ? `${title}\n${excerpt}` : title

  try {
    const chunks = await searchRelevantChunks(query, 6, 0.35)

    // 过滤掉当前文章自身的内容
    const filtered = chunks.filter(c => {
      if (c.metadata.source === 'article') {
        const slug = `${c.metadata.category}/${c.metadata.slug}`
        return slug !== currentSlug
      }
      return true
    })

    return NextResponse.json({ chunks: filtered.slice(0, 4) })
  } catch (e) {
    console.error('related-knowledge error:', e)
    return NextResponse.json({ chunks: [] })
  }
}
