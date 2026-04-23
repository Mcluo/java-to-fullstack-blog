import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: '生产环境不支持爬取' }, { status: 503 })
  }

  try {
    const projectRoot = process.cwd()
    const script = path.join(projectRoot, 'scripts', 'fetch-feeds.ts')

    const output = execSync(`npx tsx "${script}"`, {
      encoding: 'utf8',
      cwd: projectRoot,
      timeout: 120000,
      env: { ...process.env, PATH: `${process.env.HOME}/.agent-reach-venv/bin:${process.env.PATH}` },
    })

    // Parse summary from output
    const match = output.match(/新增 (\d+) 条，总计 (\d+) 条/)
    return NextResponse.json({
      success: true,
      newItems: match ? parseInt(match[1]) : 0,
      totalItems: match ? parseInt(match[2]) : 0,
      output,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `爬取失败: ${err.message?.slice(0, 200)}`, output: err.stdout || '' },
      { status: 500 }
    )
  }
}
