import { NextRequest, NextResponse } from 'next/server'
import { searchRelevantChunks } from '@/lib/rag'
import { getAllArticles } from '@/lib/articles'
import type { ArticleMeta } from '@/lib/articles'

interface SearchResult extends ArticleMeta {
  score: number
  matchedText?: string
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    // 语义搜索：复用 RAG embedding
    const chunks = await searchRelevantChunks(query, 10, 0.25)

    if (chunks.length > 0) {
      // 按文章聚合，取最高分
      const articleMap = new Map<string, SearchResult>()
      const allArticles = getAllArticles()

      for (const chunk of chunks) {
        const key = `${chunk.metadata.category}/${chunk.metadata.slug}`
        const existing = articleMap.get(key)

        if (!existing || chunk.score > existing.score) {
          // 找到完整的 ArticleMeta
          const meta = allArticles.find(
            a => a.category === chunk.metadata.category && a.slug === chunk.metadata.slug
          )

          if (meta) {
            articleMap.set(key, {
              ...meta,
              score: chunk.score,
              matchedText: chunk.text.slice(0, 150),
            })
          }
        }
      }

      const results = Array.from(articleMap.values())
        .sort((a, b) => b.score - a.score)

      return NextResponse.json({ results, mode: 'semantic' })
    }

    // Fallback：关键词匹配
    const allArticles = getAllArticles()
    const lowerQuery = query.toLowerCase()
    const results: SearchResult[] = allArticles
      .filter(article =>
        article.title.toLowerCase().includes(lowerQuery) ||
        article.excerpt.toLowerCase().includes(lowerQuery) ||
        article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .map(article => ({ ...article, score: 1 }))

    return NextResponse.json({ results, mode: 'keyword' })
  } catch (error: any) {
    console.error('Search API error:', error)

    // 降级到关键词搜索
    const allArticles = getAllArticles()
    const lowerQuery = query.toLowerCase()
    const results: SearchResult[] = allArticles
      .filter(article =>
        article.title.toLowerCase().includes(lowerQuery) ||
        article.excerpt.toLowerCase().includes(lowerQuery) ||
        article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .map(article => ({ ...article, score: 1 }))

    return NextResponse.json({ results, mode: 'keyword' })
  }
}
