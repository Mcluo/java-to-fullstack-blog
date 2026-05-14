import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `你是一个视频/文章内容助手。用户已经读过 AI 生成的结构化总结，现在想对具体内容追问。

你的职责：
1. 只基于提供的「原始转录」和「结构化总结」回答，不引入外部知识
2. 引用具体内容时，如果有时间戳标记（如 [03:45]），务必标注出来
3. 如果问题超出内容范围，明确说「视频中没有涉及这个话题」
4. 回答简洁有力，不要啰嗦，中文回答
5. 可以引用原文关键句子，用「」括起来

格式规范：
- 时间戳用 [MM:SS] 格式标注
- 列举要点时用短横线列表
- 不要用 markdown 标题（#）`

export async function POST(request: NextRequest) {
  if (process.env.VERCEL) {
    return new Response(JSON.stringify({ error: '生产环境不支持' }), { status: 503 })
  }

  const { summary, subtitle, messages } = await request.json()

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: '缺少对话内容' }), { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API Key 未配置' }), { status: 500 })
  }

  const client = new Anthropic({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
  })

  // 构建上下文：把 summary 和 subtitle 放进 system 或第一条消息
  const contextBlock = [
    summary ? `【结构化总结】\n${summary}` : '',
    subtitle ? `【原始转录（最多15000字）】\n${subtitle.slice(0, 15000)}` : '',
  ].filter(Boolean).join('\n\n')

  const systemWithContext = contextBlock
    ? `${SYSTEM_PROMPT}\n\n以下是本次视频/文章的内容供你参考：\n\n${contextBlock}`
    : SYSTEM_PROMPT

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: process.env.CHAT_MODEL || 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: systemWithContext,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          stream: true,
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n[错误] ${err.message?.slice(0, 100)}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
