import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getArticleBySlug } from '@/lib/articles'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  baseURL: process.env.ANTHROPIC_BASE_URL
    ? `${process.env.ANTHROPIC_BASE_URL}`
    : undefined,
})

export async function POST(request: NextRequest) {
  try {
    const { category, slug } = await request.json()

    if (!category || !slug) {
      return NextResponse.json({ error: '缺少 category 或 slug' }, { status: 400 })
    }

    const article = getArticleBySlug(category, slug)
    if (!article) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    const response = await anthropic.messages.create({
      model: process.env.CHAT_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `从下面的文章中提炼出可执行的待办事项（TODO）。

规则：
1. 提取文章中提到的"下一步"、"待完成"、"TODO"、"计划"、"建议"等行动项
2. 如果文章是教程，提取关键的学习/实践步骤
3. 如果文章是分析报告，提取推荐的行动建议
4. 每个 todo 要简洁可执行（一句话）
5. 为每个 todo 判断优先级（1=紧急 2=高 3=中 4=低）
6. 为每个 todo 选择分类：工作/学习/博客/生活/工具
7. 返回 JSON 数组格式，不要返回其他内容

返回格式：
[{"title": "xxx", "priority": 1, "category": "学习"}]

文章标题：${article.title}
文章内容：
${article.content.slice(0, 8000)}`,
        },
      ],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    // 提取 JSON 数组
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: '未能提取到待办事项', raw: text }, { status: 500 })
    }

    const todos = JSON.parse(jsonMatch[0])
    return NextResponse.json({ todos, articleTitle: article.title })
  } catch (error) {
    console.error('Todo extract error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '提取失败' },
      { status: 500 }
    )
  }
}
