import { NextResponse } from 'next/server'
import { getAllArticles } from '@/lib/articles'
import { isRagAvailable } from '@/lib/rag'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, { status: string; detail?: string | number }> = {}

  // Check articles
  try {
    const articles = getAllArticles()
    checks.articles = { status: 'ok', detail: articles.length }
  } catch (e: any) {
    checks.articles = { status: 'error', detail: e.message }
  }

  // Check RAG
  checks.rag = { status: isRagAvailable() ? 'ok' : 'unavailable' }

  // Check API key
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
  checks.api_key = { status: hasKey ? 'ok' : 'missing' }

  const allOk = Object.values(checks).every(
    (c) => c.status === 'ok' || c.status === 'unavailable'
  )

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  })
}
