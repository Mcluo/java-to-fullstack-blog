import { NextRequest, NextResponse } from 'next/server'
import { searchRelevantChunks } from '@/lib/rag'
import { getAllArticles, getArticleBySlug } from '@/lib/articles'
import type { ArticleMeta } from '@/lib/articles'

interface SearchResult extends ArticleMeta {
  score: number
  matchType: 'exact' | 'keyword' | 'semantic'
  matchedText?: string
}

/**
 * 关键词搜索：匹配标题、摘要、标签、正文
 * 返回带相关性分数的结果，精确匹配标题得分最高
 */
function keywordSearch(query: string, allArticles: ArticleMeta[]): SearchResult[] {
  const lowerQuery = query.toLowerCase()
  const queryTerms = lowerQuery.split(/\s+/).filter(t => t.length > 0)
  const results: SearchResult[] = []

  for (const article of allArticles) {
    const titleLower = article.title.toLowerCase()
    const excerptLower = article.excerpt.toLowerCase()
    const tagsLower = article.tags.map(t => t.toLowerCase())
    let score = 0
    let matchType: 'exact' | 'keyword' = 'keyword'

    // 1. 标题完全包含查询词 → 高分
    if (titleLower.includes(lowerQuery)) {
      score += 100
      matchType = 'exact'
    }

    // 2. 标题包含每个查询词 → 中高分
    const titleTermHits = queryTerms.filter(t => titleLower.includes(t)).length
    if (titleTermHits > 0) {
      score += titleTermHits * 30
    }

    // 3. 摘要包含查询词 → 中分
    if (excerptLower.includes(lowerQuery)) {
      score += 40
    }
    const excerptTermHits = queryTerms.filter(t => excerptLower.includes(t)).length
    if (excerptTermHits > 0) {
      score += excerptTermHits * 10
    }

    // 4. 标签精确匹配 → 中分
    const tagHits = tagsLower.filter(tag =>
      queryTerms.some(t => tag.includes(t))
    ).length
    if (tagHits > 0) {
      score += tagHits * 20
    }

    // 5. 正文搜索（仅在标题/摘要/标签都没命中时，做正文搜索）
    if (score === 0) {
      try {
        const full = getArticleBySlug(article.category, article.slug)
        if (full) {
          const contentLower = full.content.toLowerCase()
          if (contentLower.includes(lowerQuery)) {
            score += 15
          } else {
            const contentTermHits = queryTerms.filter(t => contentLower.includes(t)).length
            if (contentTermHits > 0) {
              score += contentTermHits * 5
            }
          }
        }
      } catch {
        // skip unreadable articles
      }
    }

    if (score > 0) {
      results.push({ ...article, score, matchType })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const allArticles = getAllArticles()

  try {
    // 第一步：关键词搜索（始终执行，覆盖所有文章）
    const keywordResults = keywordSearch(query, allArticles)

    // 第二步：语义搜索（补充，仅对有 embedding 的文章有效）
    let semanticResults: SearchResult[] = []
    try {
      const chunks = await searchRelevantChunks(query, 10, 0.45) // 提高阈值到 0.45
      if (chunks.length > 0) {
        const articleMap = new Map<string, SearchResult>()
        for (const chunk of chunks) {
          const key = `${chunk.metadata.category}/${chunk.metadata.slug}`
          const existing = articleMap.get(key)
          if (!existing || chunk.score > existing.score) {
            const meta = allArticles.find(
              a => a.category === chunk.metadata.category && a.slug === chunk.metadata.slug
            )
            if (meta) {
              articleMap.set(key, {
                ...meta,
                score: chunk.score,
                matchType: 'semantic',
                matchedText: chunk.text.slice(0, 150),
              })
            }
          }
        }
        semanticResults = Array.from(articleMap.values())
      }
    } catch {
      // 语义搜索失败，静默降级
    }

    // 第三步：合并去重，关键词精确匹配优先
    const merged = new Map<string, SearchResult>()

    // 先放关键词结果（高优先级）
    for (const r of keywordResults) {
      const key = `${r.category}/${r.slug}`
      merged.set(key, r)
    }

    // 语义搜索结果仅补充关键词没命中的文章
    for (const r of semanticResults) {
      const key = `${r.category}/${r.slug}`
      if (!merged.has(key)) {
        merged.set(key, r)
      }
    }

    // 排序：精确匹配 > 关键词匹配 > 语义匹配
    const results = Array.from(merged.values()).sort((a, b) => {
      // matchType 优先级
      const typePriority = { exact: 3, keyword: 2, semantic: 1 }
      const typeDiff = typePriority[b.matchType] - typePriority[a.matchType]
      if (typeDiff !== 0) return typeDiff
      // 同类型按分数排
      return b.score - a.score
    })

    const mode = keywordResults.length > 0 && semanticResults.length > 0
      ? 'hybrid'
      : keywordResults.length > 0
        ? 'keyword'
        : 'semantic'

    return NextResponse.json({ results, mode })
  } catch (error: unknown) {
    console.error('Search API error:', error)

    // 降级到纯关键词搜索
    const results = keywordSearch(query, allArticles)
    return NextResponse.json({ results, mode: 'keyword' })
  }
}
