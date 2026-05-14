import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

const CACHE_DIR = path.join(process.cwd(), 'content', 'github', 'insights')
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface RepoInsight {
  oneLiner: string
  problemSolved: string
  quickStart: string
  keyFeatures: string[]
  targetUser: string
  cachedAt: string
}

function cacheKey(fullName: string) {
  return path.join(CACHE_DIR, fullName.replace('/', '-') + '.json')
}

function loadCache(fullName: string): RepoInsight | null {
  try {
    const p = cacheKey(fullName)
    if (!fs.existsSync(p)) return null
    const data = JSON.parse(fs.readFileSync(p, 'utf8')) as RepoInsight
    if (Date.now() - new Date(data.cachedAt).getTime() > CACHE_TTL_MS) return null
    return data
  } catch { return null }
}

function saveCache(fullName: string, insight: RepoInsight) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
    fs.writeFileSync(cacheKey(fullName), JSON.stringify(insight, null, 2) + '\n', 'utf8')
  } catch {}
}

async function fetchReadme(fullName: string): Promise<string> {
  const branches = ['main', 'master', 'HEAD']
  for (const branch of branches) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${fullName}/${branch}/README.md`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (res.ok) {
        const text = await res.text()
        if (text.length > 100) return text.slice(0, 12000)
      }
    } catch {}
  }
  return ''
}

async function generateInsight(
  fullName: string,
  description: string,
  readme: string,
  topics: string[]
): Promise<RepoInsight> {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('API Key not configured')

  const client = new Anthropic({ apiKey, baseURL: process.env.ANTHROPIC_BASE_URL || undefined })

  const context = [
    `仓库: ${fullName}`,
    description ? `描述: ${description}` : '',
    topics.length ? `Topics: ${topics.join(', ')}` : '',
    readme ? `\nREADME（前12000字）:\n${readme}` : '',
  ].filter(Boolean).join('\n')

  const msg = await client.messages.create({
    model: process.env.CHAT_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `你是一个开发者工具评测专家。请阅读以下 GitHub 仓库信息，用简体中文帮普通开发者快速看懂这个项目。

严格按以下 JSON 格式输出，不要输出任何 JSON 以外的内容：
{
  "oneLiner": "用一句话说这个项目是什么（20字以内，通俗易懂）",
  "problemSolved": "它解决了什么具体问题（40字以内，说人话）",
  "quickStart": "最快上手的方式，若有安装/运行命令请直接给出，否则说明入口（60字以内）",
  "keyFeatures": ["核心特性1（15字以内）", "核心特性2", "核心特性3"],
  "targetUser": "谁最适合用这个（20字以内，例如：做 React 项目的前端开发者）"
}

${context}`,
    }],
  })

  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('invalid response')
  let raw = block.text.trim()
  if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  const parsed = JSON.parse(raw) as Omit<RepoInsight, 'cachedAt'>
  return { ...parsed, cachedAt: new Date().toISOString() }
}

export async function POST(request: NextRequest) {
  const { fullName, description = '', topics = [] } = await request.json()
  if (!fullName) return NextResponse.json({ error: '缺少 fullName' }, { status: 400 })

  const cached = loadCache(fullName)
  if (cached) return NextResponse.json(cached)

  const readme = await fetchReadme(fullName)
  const insight = await generateInsight(fullName, description, readme, topics)
  saveCache(fullName, insight)

  return NextResponse.json(insight)
}
