import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

const HOME = process.env.HOME || ''
const VENV_BIN = path.join(HOME, '.agent-reach-venv', 'bin')
const BILI_CLI = path.join(VENV_BIN, 'bili')
const YTDLP = path.join(VENV_BIN, 'yt-dlp')

function detectPlatform(url: string): 'bilibili' | 'youtube' | 'xiaohongshu' | 'web' {
  if (url.includes('bilibili.com') || url.match(/^BV[a-zA-Z0-9]+$/)) return 'bilibili'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu'
  return 'web'
}

function extractBvid(url: string): string {
  if (url.match(/^BV[a-zA-Z0-9]+$/)) return url
  const m = url.match(/video\/(BV[a-zA-Z0-9]+)/)
  return m?.[1] || ''
}

function getVideoTitle(url: string, platform: string): string {
  try {
    if (platform === 'bilibili') {
      const bvid = extractBvid(url)
      const output = execSync(
        `"${YTDLP}" --print "%(title)s" --skip-download "${url.includes('http') ? url : 'https://www.bilibili.com/video/' + bvid}" 2>/dev/null`,
        { encoding: 'utf8', timeout: 15000 }
      )
      return output.trim()
    }
    if (platform === 'youtube') {
      const output = execSync(
        `"${YTDLP}" --print "%(title)s" --skip-download "${url}" 2>/dev/null`,
        { encoding: 'utf8', timeout: 15000 }
      )
      return output.trim()
    }
  } catch {}
  return ''
}

function transcribeBilibili(bvid: string): string | null {
  const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe-video.sh')
  try {
    return execSync(`bash "${scriptPath}" "${bvid}"`, {
      encoding: 'utf8',
      timeout: 600000,
      maxBuffer: 10 * 1024 * 1024,
    }).trim() || null
  } catch { return null }
}

function transcribeYouTube(url: string): string | null {
  const tmpDir = '/tmp/feed-subs'
  try {
    execSync(`mkdir -p "${tmpDir}" && rm -f "${tmpDir}"/*.vtt "${tmpDir}"/*.srt 2>/dev/null || true`)
    execSync(
      `"${YTDLP}" --write-auto-sub --sub-lang zh-Hans,zh,en --skip-download -o "${tmpDir}/%(id)s" "${url}" 2>/dev/null`,
      { encoding: 'utf8', timeout: 30000 }
    )
    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.vtt') || f.endsWith('.srt'))
    if (files.length === 0) return null
    const content = fs.readFileSync(path.join(tmpDir, files[0]), 'utf8')
    return content.split('\n')
      .filter(l => !l.match(/^\d+$/) && !l.match(/-->/) && !l.match(/^WEBVTT/) && !l.match(/^Kind:/) && !l.match(/^Language:/) && l.trim())
      .map(l => l.replace(/<[^>]*>/g, '').trim())
      .filter((l, i, arr) => l && l !== arr[i - 1])
      .join('\n').slice(0, 15000) || null
  } catch { return null }
}

function fetchXiaohongshu(url: string): string | null {
  const scriptPath = path.join(process.cwd(), 'scripts', 'fetch-xhs.sh')
  let raw = ''
  try {
    raw = execSync(`bash "${scriptPath}" "${url}"`, {
      encoding: 'utf8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (execErr: any) {
    // execSync 抛出说明脚本非零退出或超时
    const stderr = execErr.stderr?.toString().trim() || ''
    const stdout = execErr.stdout?.toString().trim() || ''
    // 尝试从 stdout 解析 JSON（有时脚本打印 JSON 后才 exit 1）
    try {
      const d = JSON.parse(stdout || stderr)
      if (d.error) throw new Error(`[小红书] ${d.error}`)
    } catch {}
    if (execErr.signal === 'SIGTERM') throw new Error('[小红书] 抓取超时（>60s），请重试')
    throw new Error(`[小红书] 脚本执行失败: ${stderr.slice(0, 200) || execErr.message?.slice(0, 200)}`)
  }

  if (!raw) throw new Error('[小红书] 脚本无输出，请检查 debug Chrome 是否运行')

  let data: any
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error(`[小红书] 输出解析失败: ${raw.slice(0, 100)}`)
  }

  if (!data.ok) {
    const errMsg = data.error || '内容获取失败'
    if (errMsg.includes('debug Chrome 未运行')) {
      throw new Error('请先启动 debug Chrome：运行 scripts/start-chrome-debug.sh')
    }
    throw new Error(`[小红书] ${errMsg}`)
  }
  return data.content || null
}

function fetchWebContent(url: string): Promise<string | null> {
  return fetch(`https://r.jina.ai/${url}`, {
    headers: { 'User-Agent': 'FeedReader/1.0' },
    signal: AbortSignal.timeout(15000),
  }).then(r => r.text()).then(t => t.trim().length > 100 ? t.slice(0, 15000) : null).catch(() => null)
}

async function summarize(title: string, text: string, platform?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('API Key not configured')

  const client = new Anthropic({
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
  })

  const message = await client.messages.create({
    model: process.env.CHAT_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `你是一个专业的内容分析师。请对以下${platform === 'xiaohongshu' ? '小红书笔记' : '视频/文章'}内容进行结构化深度总结。

严格按以下 JSON 格式返回，不要输出任何 JSON 以外的内容：

{
  "overview": "一句话概括核心主题（30字以内）",
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
1. 根据内容话题转换自动划分章节（通常3-8个）
2. timestamp 从转录文本中的 [MM:SS] 标记推断
3. 每个章节 keyPoints 列出 2-4 个核心要点
4. 使用简体中文
5. 确保覆盖所有重要内容
6. 只输出 JSON，不加 markdown 代码块
7. JSON 字符串值中不要使用中文双引号（\u201c\u201d），用「」代替

标题: ${title}

转录文本:
${text.slice(0, 15000)}`,
    }],
  })

  const block = message.content[0]
  if (block.type !== 'text') return ''

  let raw = block.text.trim()
  if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  try {
    return JSON.stringify(JSON.parse(raw))
  } catch {
    // Fix Chinese quotes and newlines in strings
    let fixed = raw.replace(/\u201c/g, '\u300c').replace(/\u201d/g, '\u300d')
    const chars: string[] = []
    let inStr = false, esc = false
    for (const c of fixed) {
      if (esc) { chars.push(c); esc = false; continue }
      if (c === '\\') { esc = true; chars.push(c); continue }
      if (c === '"') { inStr = !inStr; chars.push(c); continue }
      if (inStr && c === '\n') { chars.push(' '); continue }
      chars.push(c)
    }
    try { return JSON.stringify(JSON.parse(chars.join(''))) } catch { return raw }
  }
}

export async function POST(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: '生产环境不支持' }, { status: 503 })
  }

  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: '请输入 URL' }, { status: 400 })

  const platform = detectPlatform(url)
  let videoUrl = url
  let title = ''
  let subtitle: string | null = null

  try {
    // Get title
    title = getVideoTitle(url, platform) || url

    // Get content
    if (platform === 'bilibili') {
      const bvid = extractBvid(url)
      if (!bvid) return NextResponse.json({ error: '无法解析 B站 视频 ID' }, { status: 400 })
      videoUrl = `https://www.bilibili.com/video/${bvid}`
      subtitle = transcribeBilibili(bvid)
    } else if (platform === 'youtube') {
      subtitle = transcribeYouTube(url)
    } else if (platform === 'xiaohongshu') {
      subtitle = fetchXiaohongshu(url)
    } else {
      subtitle = await fetchWebContent(url)
    }

    if (!subtitle) {
      return NextResponse.json({ error: '无法获取内容（转录/抓取失败）' }, { status: 422 })
    }

    const summary = await summarize(title, subtitle, platform)

    return NextResponse.json({ summary, subtitle, title, videoUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message?.slice(0, 200) || '总结失败' }, { status: 500 })
  }
}
