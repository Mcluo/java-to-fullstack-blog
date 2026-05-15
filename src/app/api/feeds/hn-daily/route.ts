import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'content', 'feeds', 'hn-daily.json')

function loadItems() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '30')
  const offset = parseInt(searchParams.get('offset') || '0')

  const all = loadItems()
  const items = all.slice(offset, offset + limit)

  return NextResponse.json({ items, total: all.length })
}

export async function POST() {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: '生产环境不支持拉取' }, { status: 503 })
  }

  try {
    const script = path.join(process.cwd(), 'scripts', 'fetch-hn-daily.ts')
    const output = execSync(`npx tsx "${script}"`, {
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 30000,
    })

    const match = output.match(/新增 (\d+) 条，总计 (\d+) 条/)
    return NextResponse.json({
      success: true,
      newItems: match ? parseInt(match[1]) : 0,
      totalItems: match ? parseInt(match[2]) : 0,
      output,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `拉取失败: ${err.message?.slice(0, 200)}` },
      { status: 500 }
    )
  }
}
