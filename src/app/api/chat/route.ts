import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { searchRelevantChunks, buildContext, isRagAvailable } from '@/lib/rag'
import { getAllArticles, CATEGORY_CONFIG } from '@/lib/articles'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL
    ? `${process.env.ANTHROPIC_BASE_URL}`
    : undefined,
})

// 基础系统提示词
const BASE_SYSTEM_PROMPT = `你是一个专业的全栈+AI学习助手，专门帮助Java工程师转型学习前端、后端和AI技术。

## 你的专长
- 解释TypeScript、React、Node.js等技术概念
- 将新技术与Java/Spring进行对比，帮助理解
- 推荐学习路径和资源
- 回答编程问题和最佳实践
- 提供实用的代码示例
- 分享职业成长和技术趋势的见解

## 回答风格
- 简洁明了，避免冗长
- 使用Java类比帮助理解
- 提供具体示例和链接
- 鼓励实践和项目驱动学习
- 强调AI辅助学习的价值

## 重要原则
- 推荐"30分钟法则"：快速实践，立即看到成果
- 强调边做项目边学习，而非死记语法
- 建议使用AI工具（Claude、ChatGPT）辅助学习
- 当回答基于网站文章内容时，使用 markdown 链接引用来源文章
- 如果检索到相关文章内容，优先基于文章内容回答，并标注来源
- 如果没有检索到相关内容，使用你的通用知识回答，但不要伪造文章引用

记住：你的目标是让Java工程师轻松、快速、有信心地完成技术转型！`

/**
 * 生成网站文章目录概览，注入 system prompt
 */
function buildArticleCatalog(): string {
  const articles = getAllArticles()
  const byCategory: Record<string, Array<{ title: string; slug: string; category: string }>> = {}

  for (const a of articles) {
    if (!byCategory[a.category]) byCategory[a.category] = []
    byCategory[a.category].push({ title: a.title, slug: a.slug, category: a.category })
  }

  const lines = [`## 网站文章目录（共 ${articles.length} 篇）\n`]
  for (const [cat, items] of Object.entries(byCategory)) {
    const catName = CATEGORY_CONFIG[cat]?.name || cat
    lines.push(`### ${catName}（${items.length} 篇）`)
    for (const item of items) {
      lines.push(`- [${item.title}](/articles/${item.category}/${item.slug})`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [], contexts = [] } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    // 检查API Key
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      console.error('ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is not set')
      return NextResponse.json(
        { error: 'API配置错误，请联系管理员' },
        { status: 500 }
      )
    }

    // RAG 检索：基于用户消息检索相关文章片段
    let ragContext = ''
    const ragAvailable = isRagAvailable()
    console.log(`[RAG] 可用: ${ragAvailable}, 查询: "${message}"`)
    if (ragAvailable) {
      try {
        const relevantChunks = await searchRelevantChunks(message, 5, 0.3)
        console.log(`[RAG] 检索到 ${relevantChunks.length} 个相关片段`)
        relevantChunks.forEach((c, i) => {
          console.log(`  [${i + 1}] ${c.metadata.title} (score: ${c.score.toFixed(3)})`)
        })
        ragContext = buildContext(relevantChunks)
      } catch (err) {
        console.warn('RAG 检索失败，降级为无上下文模式:', err)
      }
    }

    // 构建用户提供的上下文
    let userContext = ''
    if (Array.isArray(contexts) && contexts.length > 0) {
      const sections = contexts.map((ctx: { type: string; label: string; content: string }, i: number) => {
        const typeLabel = ctx.type === 'page' ? '页面内容' : '用户提供的文本'
        return `### ${typeLabel} ${i + 1}: ${ctx.label}\n\n${ctx.content}`
      })
      userContext = `## 用户提供的上下文\n\n以下是用户主动添加的参考内容，请优先基于这些内容回答问题。\n\n${sections.join('\n\n---\n\n')}`
    }

    // 组装 system prompt：基础 prompt + 文章目录 + RAG 上下文 + 用户上下文
    const catalog = buildArticleCatalog()
    const systemPrompt = [BASE_SYSTEM_PROMPT, catalog, ragContext, userContext]
      .filter(Boolean)
      .join('\n\n')

    // 构建消息历史
    const messages = [
      ...history.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    // 创建流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 使用Anthropic的流式API
          const messageStream = await anthropic.messages.stream({
            model: process.env.CHAT_MODEL || 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages: messages
          })

          // 监听文本块事件
          messageStream.on('text', (text) => {
            const data = `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`
            controller.enqueue(encoder.encode(data))
          })

          // 监听完成事件
          messageStream.on('message', (message) => {
            const data = `data: ${JSON.stringify({
              type: 'done',
              usage: {
                input_tokens: message.usage.input_tokens,
                output_tokens: message.usage.output_tokens
              }
            })}\n\n`
            controller.enqueue(encoder.encode(data))
            controller.close()
          })

          // 监听错误事件
          messageStream.on('error', (error) => {
            console.error('Stream error:', error)
            const data = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
            controller.enqueue(encoder.encode(data))
            controller.close()
          })

        } catch (error: any) {
          console.error('Stream creation error:', error)
          const data = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
          controller.enqueue(encoder.encode(data))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('Chat API Error:', error)

    // 处理不同类型的错误
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'API密钥无效，请检查配置' },
        { status: 401 }
      )
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: 'API请求过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'AI助手暂时不可用，请稍后再试' },
      { status: 500 }
    )
  }
}
