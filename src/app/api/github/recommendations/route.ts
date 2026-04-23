import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { searchMultipleQueries } from '@/lib/github'
import type { GitHubRepo } from '@/lib/github'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL
    ? `${process.env.ANTHROPIC_BASE_URL}`
    : undefined,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queries, interests, languages, keywords, dismissed = [] } = body as {
      queries: string[]
      interests: string[]
      languages: string[]
      keywords: string[]
      dismissed: number[]
    }

    if (!queries || queries.length === 0) {
      return new Response(JSON.stringify({ error: 'No queries provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 1. 搜索候选仓库
    const result = await searchMultipleQueries(queries, 'stars', 30, 1)

    // 过滤掉已标记不感兴趣的
    const candidates = result.items.filter(r => !dismissed.includes(r.id))

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ repos: [], total: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 取前 12 个用于 AI 推荐
    const topCandidates = candidates.slice(0, 12)

    // 2. 用 AI 生成推荐理由（流式 SSE）
    const userProfile = [
      interests.length > 0 ? `兴趣领域: ${interests.join(', ')}` : '',
      languages.length > 0 ? `偏好语言: ${languages.join(', ')}` : '',
      keywords.length > 0 ? `关注关键词: ${keywords.join(', ')}` : '',
    ].filter(Boolean).join('\n')

    const repoList = topCandidates.map((r, i) => formatRepoForPrompt(r, i)).join('\n\n')

    const prompt = `你是一个 GitHub 项目推荐助手。根据用户的技术偏好，为以下项目生成个性化推荐。

## 用户画像
${userProfile}

## 候选项目
${repoList}

## 任务
为每个项目生成推荐信息。严格按照以下 JSON 数组格式输出，不要添加其他内容：

[
  {
    "index": 0,
    "reason": "推荐理由（1-2句，说明为什么适合该用户，结合用户兴趣）",
    "summary": "项目总结（1句话，概括项目核心价值和用途）",
    "matchedInterests": ["匹配的兴趣标签1", "匹配的兴趣标签2"]
  }
]

注意：
- reason 要个性化，体现与用户兴趣的关联
- summary 要简洁精准，让用户快速理解项目价值
- matchedInterests 从用户的兴趣领域和关键词中选取匹配项
- 用中文输出`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 先发送仓库基础数据
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'repos', data: topCandidates })}\n\n`
          ))

          // 调用 AI 生成推荐
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
          })

          const text = response.content
            .filter(block => block.type === 'text')
            .map(block => block.type === 'text' ? block.text : '')
            .join('')

          // 解析 AI 响应
          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const recommendations = JSON.parse(jsonMatch[0]) as Array<{
              index: number
              reason: string
              summary: string
              matchedInterests: string[]
            }>

            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'recommendations', data: recommendations })}\n\n`
            ))
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          console.error('Recommendation AI error:', err)
          // 即使 AI 失败，也返回基础仓库数据
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: 'AI 推荐生成失败，显示基础结果' })}\n\n`
          ))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Recommendations error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function formatRepoForPrompt(repo: GitHubRepo, index: number): string {
  return `### [${index}] ${repo.full_name}
- Stars: ${repo.stargazers_count.toLocaleString()} | Forks: ${repo.forks_count.toLocaleString()}
- Language: ${repo.language || 'N/A'}
- Topics: ${repo.topics.slice(0, 8).join(', ') || 'none'}
- Description: ${repo.description || 'No description'}
- Created: ${repo.created_at?.slice(0, 10)} | Updated: ${repo.pushed_at?.slice(0, 10)}`
}
