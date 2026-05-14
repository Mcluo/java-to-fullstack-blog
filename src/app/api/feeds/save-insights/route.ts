import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { addTodo } from '@/lib/todos'
import { appendVideoInsight } from '@/lib/rag'
import { loadFeedItems, saveFeedItems, loadFavorites, saveFavorites } from '@/lib/feeds'

function slugify(text: string): string {
  return text
    .slice(0, 40)
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export async function POST(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: '生产环境不支持' }, { status: 503 })
  }

  const { videoTitle, videoUrl, insights, todos, destinations, itemId, itemType } = await request.json() as {
    videoTitle: string
    videoUrl: string
    insights: string[]
    todos: string[]
    destinations: string[]   // ['notes', 'todos', 'rag', 'card']
    itemId?: string
    itemType?: 'feedItem' | 'favorite'
  }

  if (!insights?.length && !todos?.length) {
    return NextResponse.json({ error: '没有可保存的内容' }, { status: 400 })
  }

  const results: Record<string, { ok: boolean; detail?: string }> = {}
  const date = new Date().toISOString().slice(0, 10)

  // ── 1. 保存为笔记 ────────────────────────────────
  if (destinations.includes('notes')) {
    try {
      const notesDir = path.join(os.homedir(), 'docs', 'tech-notes', 'video-insights')
      fs.mkdirSync(notesDir, { recursive: true })

      const slug = `${date}-${slugify(videoTitle || 'insight')}`
      const filePath = path.join(notesDir, `${slug}.md`)

      const insightLines = insights.map(i => `- ${i}`).join('\n')
      const todoLines = todos.map(t => `- [ ] ${t}`).join('\n')

      const content = `---
title: "${(videoTitle || '视频').replace(/"/g, '\\"')} 追问洞见"
date: ${date}
source: "${videoUrl}"
tags: [视频洞见, AI总结]
---

# ${videoTitle || '视频'} 追问洞见

> 来源：[${videoTitle || videoUrl}](${videoUrl})

## 关键洞见

${insightLines || '（无）'}
${todoLines ? `\n## 行动项\n\n${todoLines}` : ''}
`
      fs.writeFileSync(filePath, content, 'utf8')
      results.notes = { ok: true, detail: `video-insights/${slug}.md` }
    } catch (err: any) {
      results.notes = { ok: false, detail: err.message }
    }
  }

  // ── 2. 写入 Todo 系统 ────────────────────────────
  if (destinations.includes('todos') && todos?.length) {
    const errors: string[] = []
    for (const title of todos) {
      try {
        await addTodo({
          title,
          category: '学习',
          priority: 3,
          description: `来自视频：${videoTitle || videoUrl}`,
        })
      } catch (err: any) {
        errors.push(err.message)
      }
    }
    results.todos = errors.length === 0
      ? { ok: true, detail: `新增 ${todos.length} 条待办` }
      : { ok: false, detail: errors.join('; ') }
  }

  // ── 3. 加入 RAG 知识库 ───────────────────────────
  if (destinations.includes('rag') && insights?.length) {
    try {
      const ragText = [
        `视频标题：${videoTitle || videoUrl}`,
        `来源：${videoUrl}`,
        '',
        '关键洞见：',
        ...insights.map(i => `• ${i}`),
        ...(todos.length ? ['', '行动项：', ...todos.map(t => `• ${t}`)] : []),
      ].join('\n')

      await appendVideoInsight({
        title: videoTitle || videoUrl,
        url: videoUrl,
        text: ragText,
      })
      results.rag = { ok: true }
    } catch (err: any) {
      results.rag = { ok: false, detail: err.message }
    }
  }

  // ── 4. 附到卡片 ──────────────────────────────────
  if (destinations.includes('card') && insights?.length && itemId) {
    try {
      if (itemType === 'favorite') {
        const favorites = loadFavorites()
        const idx = favorites.findIndex(f => f.id === itemId)
        if (idx === -1) throw new Error('收藏条目不存在')
        favorites[idx].userInsights = [
          ...(favorites[idx].userInsights || []),
          ...insights,
        ]
        saveFavorites(favorites)
      } else {
        const items = loadFeedItems()
        const idx = items.findIndex(i => i.id === itemId)
        if (idx === -1) throw new Error('条目不存在')
        items[idx].userInsights = [
          ...(items[idx].userInsights || []),
          ...insights,
        ]
        saveFeedItems(items)
      }
      results.card = { ok: true, detail: `已附加 ${insights.length} 条洞见` }
    } catch (err: any) {
      results.card = { ok: false, detail: err.message }
    }
  }

  return NextResponse.json({ results })
}
