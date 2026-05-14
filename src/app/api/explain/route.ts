import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL
    ? `${process.env.ANTHROPIC_BASE_URL}`
    : undefined,
})

export async function POST(request: NextRequest) {
  try {
    const { term, context } = await request.json()

    if (!term) {
      return NextResponse.json({ error: '缺少概念内容' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      return NextResponse.json({ error: 'API 配置错误' }, { status: 500 })
    }

    const prompt = context
      ? `请解释以下概念：「${term}」

这段文字来自一篇技术文章，上下文如下：
---
${context.slice(0, 800)}
---

请给出两部分解释，用 JSON 格式返回：
{
  "general": "通用解释（2-3句话，简洁易懂，面向有一定编程基础的读者）",
  "inContext": "结合上面文章语境的具体含义（1-2句话，说明在这篇文章中它具体指什么、用来做什么）"
}

只返回 JSON，不要其他内容。`
      : `请解释以下概念：「${term}」

用 JSON 格式返回：
{
  "general": "通用解释（2-3句话，简洁易懂，面向有一定编程基础的读者）",
  "inContext": ""
}

只返回 JSON，不要其他内容。`

    const message = await anthropic.messages.create({
      model: process.env.CHAT_MODEL || 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // 提取 JSON（处理可能的 markdown 代码块）
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: '解释生成失败' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Explain API Error:', error)
    return NextResponse.json(
      { error: error.message || '解释服务暂时不可用' },
      { status: 500 }
    )
  }
}
