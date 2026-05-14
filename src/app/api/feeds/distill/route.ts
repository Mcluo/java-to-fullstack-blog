import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: '生产环境不支持' }, { status: 503 })
  }

  const { summary, messages, videoTitle } = await request.json()

  if (!messages || messages.length < 2) {
    return NextResponse.json({ error: '对话太短，无法提炼' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API Key 未配置' }, { status: 500 })

  const client = new Anthropic({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
  })

  const conversationText = messages
    .map((m: { role: string; content: string }) =>
      `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`
    )
    .join('\n\n')

  const message = await client.messages.create({
    model: process.env.CHAT_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `你是一个知识提炼专家。请从以下视频追问对话中提炼出最有价值的内容。

视频标题：${videoTitle || '（未知）'}

视频结构化总结：
${summary ? summary.slice(0, 2000) : '（无）'}

追问对话记录：
${conversationText}

请严格按以下 JSON 格式返回，不要输出任何 JSON 以外的内容：
{
  "insights": [
    "洞见1（完整一句话，30-80字）",
    "洞见2",
    "洞见3"
  ],
  "todos": [
    "行动项1（动词开头，如「学习/尝试/阅读...」）",
    "行动项2"
  ]
}

规则：
1. insights：提炼对话中真正有价值的认知，3-5条，每条是完整表达一个观点的句子
2. todos：只提炼明确的行动意图，0-3条，没有则返回空数组
3. 使用简体中文
4. 只输出 JSON，不加 markdown 代码块`,
    }],
  })

  const block = message.content[0]
  if (block.type !== 'text') return NextResponse.json({ error: '提炼失败' }, { status: 500 })

  let raw = block.text.trim()
  if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  try {
    const data = JSON.parse(raw)
    return NextResponse.json({
      insights: (data.insights || []).filter(Boolean).slice(0, 5),
      todos: (data.todos || []).filter(Boolean).slice(0, 3),
    })
  } catch {
    return NextResponse.json({ error: '解析失败，请重试' }, { status: 500 })
  }
}
