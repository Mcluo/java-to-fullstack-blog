import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { loadFeedItems, saveFeedItems } from '@/lib/feeds'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

// ── Tool paths ─────────────────────────────────────

const HOME = process.env.HOME || ''
const VENV_BIN = path.join(HOME, '.agent-reach-venv', 'bin')
const BILI_CLI = path.join(VENV_BIN, 'bili')
const YTDLP = path.join(VENV_BIN, 'yt-dlp')

// ── Subtitle extraction (YouTube only) ─────────────

function extractYouTubeSubtitle(url: string): string | null {
  try {
    const tmpDir = '/tmp/feed-subs'
    execSync(`mkdir -p "${tmpDir}" && rm -f "${tmpDir}"/*.vtt "${tmpDir}"/*.srt 2>/dev/null || true`)

    execSync(
      `"${YTDLP}" --write-auto-sub --sub-lang zh-Hans,zh,en --skip-download -o "${tmpDir}/%(id)s" "${url}" 2>/dev/null`,
      { encoding: 'utf8', timeout: 30000 }
    )

    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.vtt') || f.endsWith('.srt'))
    if (files.length === 0) return null

    const content = fs.readFileSync(path.join(tmpDir, files[0]), 'utf8')
    const lines = content.split('\n')
      .filter(l => !l.match(/^\d+$/) && !l.match(/-->/) && !l.match(/^WEBVTT/) && !l.match(/^Kind:/) && !l.match(/^Language:/) && l.trim())
      .map(l => l.replace(/<[^>]*>/g, '').trim())
      .filter((l, i, arr) => l && l !== arr[i - 1])
    return lines.join('\n').slice(0, 10000) || null
  } catch {
    return null
  }
}

// ── Audio transcription via bili audio + Groq Whisper ──

async function transcribeBilibili(bvid: string): Promise<string | null> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe-video.sh')
  try {
    const output = execSync(`bash "${scriptPath}" "${bvid}"`, {
      encoding: 'utf8',
      timeout: 600000, // 10 minutes max
      maxBuffer: 10 * 1024 * 1024,
    })
    const text = output.trim()
    return text.length > 10 ? text.slice(0, 10000) : null
  } catch (err: any) {
    console.error(`[transcribe] ${bvid}: ${err.message?.slice(0, 100)}`)
    return null
  }
}

// ── Content extraction (multi-strategy) ────────────

async function extractContent(item: { url: string; sourceType: string; id: string; title: string }): Promise<string | null> {
  // Strategy 1: YouTube → yt-dlp auto-sub
  if (item.sourceType === 'youtube') {
    const sub = extractYouTubeSubtitle(item.url)
    if (sub) return sub
  }

  // Strategy 2: Bilibili → bili audio + Groq Whisper
  if (item.sourceType === 'bilibili') {
    const bvid = item.id.replace('bili-', '')
    const transcript = await transcribeBilibili(bvid)
    if (transcript) return transcript
  }

  // Strategy 3: Jina Reader (fallback for all types)
  try {
    const res = await fetch(`https://r.jina.ai/${item.url}`, {
      headers: { 'User-Agent': 'FeedReader/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const text = await res.text()
    if (text.trim().length > 100) return text.slice(0, 8000)
  } catch {}

  return null
}

// ── AI Summarization ───────────────────────────────

interface SummaryData {
  overview: string               // 一句话概括
  chapters: {
    timestamp: string            // "00:00" 格式
    title: string                // 章节标题
    summary: string              // 章节总结
    keyPoints: string[]          // 要点列表
  }[]
  takeaway: string               // 价值判断/推荐理由
}

async function summarizeText(title: string, text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_AUTH_TOKEN not set')

  const client = new Anthropic({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
  })
  const message = await client.messages.create({
    model: process.env.CHAT_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `你是一个专业的视频内容分析师。请对以下视频内容进行**结构化深度总结**。

输出要求 — 严格按以下 JSON 格式返回，不要输出任何 JSON 以外的内容：

{
  "overview": "一句话概括视频核心主题（30字以内）",
  "chapters": [
    {
      "timestamp": "00:00",
      "title": "章节标题（10字以内）",
      "summary": "该章节的详细总结（50-150字）",
      "keyPoints": ["要点1", "要点2"]
    }
  ],
  "takeaway": "一句话价值判断或推荐理由"
}

规则：
1. 根据内容的话题转换自动划分章节（通常3-8个章节）
2. timestamp 从转录文本中的时间标记 [MM:SS] 推断，标记每个章节的起始时间
3. 如果转录文本没有时间标记，根据文本位置比例估算时间戳
4. 每个章节的 keyPoints 列出 2-4 个核心要点
5. 使用简体中文
6. 确保覆盖所有重要内容，不遗漏
7. 只输出 JSON，不要加 markdown 代码块标记
8. JSON 字符串值中不要使用中文引号（\u201c\u201d），用「」代替

标题: ${title}

转录文本（可能有少量语音识别错误）:
${text.slice(0, 15000)}`,
    }],
  })

  const block = message.content[0]
  if (block.type !== 'text') return ''

  // Try to parse as structured JSON, fallback to raw text
  let raw = block.text.trim()
  // Strip markdown code fence if present
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  try {
    const data: SummaryData = JSON.parse(raw)
    return JSON.stringify(data)
  } catch {
    // Fix common JSON issues from AI output
    let fixed = raw
    // 1. Replace Chinese quotes inside JSON strings with their escaped counterparts
    //    \u201c " and \u201d " are the most common culprits
    fixed = fixed.replace(/\u201c/g, '\u300c').replace(/\u201d/g, '\u300d')
    // 2. Replace newlines inside string values with spaces
    const chars: string[] = []
    let inStr = false, esc = false
    for (const c of fixed) {
      if (esc) { chars.push(c); esc = false; continue }
      if (c === '\\') { esc = true; chars.push(c); continue }
      if (c === '"') { inStr = !inStr; chars.push(c); continue }
      if (inStr && c === '\n') { chars.push(' '); continue }
      chars.push(c)
    }
    fixed = chars.join('')
    try {
      const data: SummaryData = JSON.parse(fixed)
      return JSON.stringify(data)
    } catch {
      return raw
    }
  }
}

// ── API Route ──────────────────────────────────────

export async function POST(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: '生产环境不支持总结' }, { status: 503 })
  }

  const body = await request.json()
  const itemIds: string[] = body.itemIds || (body.itemId ? [body.itemId] : [])

  if (itemIds.length === 0) {
    return NextResponse.json({ error: '请指定要总结的条目' }, { status: 400 })
  }

  const items = loadFeedItems()
  const results: { id: string; summary?: string; error?: string }[] = []

  for (const id of itemIds) {
    const item = items.find(i => i.id === id)
    if (!item) {
      results.push({ id, error: '条目不存在' })
      continue
    }

    if (item.summary) {
      results.push({ id, summary: item.summary })
      continue
    }

    try {
      // Extract content (subtitle / transcript / web page)
      let text = item.subtitle
      if (!text) {
        text = await extractContent(item) || undefined
        if (text) item.subtitle = text
      }

      if (!text) {
        results.push({ id, error: '无法获取内容（视频无字幕/转录失败）' })
        continue
      }

      const summary = await summarizeText(item.title, text)
      item.summary = summary
      results.push({ id, summary })
    } catch (err: any) {
      results.push({ id, error: err.message?.slice(0, 150) || '总结失败' })
    }
  }

  saveFeedItems(items)

  const succeeded = results.filter(r => r.summary).length
  const failed = results.filter(r => r.error).length

  return NextResponse.json({ results, succeeded, failed })
}
