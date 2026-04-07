#!/usr/bin/env bun
/**
 * Smoke Test Script for java-to-fullstack-blog
 *
 * Usage: bun run scripts/smoke-test.ts <BASE_URL>
 * Example: bun run scripts/smoke-test.ts https://java-to-fullstack-blog.vercel.app
 */

const BASE_URL = process.argv[2]?.replace(/\/$/, '')

if (!BASE_URL) {
  console.error('Usage: bun run scripts/smoke-test.ts <BASE_URL>')
  process.exit(1)
}

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  soft?: boolean // soft fail = warning, not blocking
}

async function runTest(
  name: string,
  fn: () => Promise<void>,
  soft = false
): Promise<TestResult> {
  const start = Date.now()
  try {
    await fn()
    const duration = Date.now() - start
    return { name, passed: true, duration, soft }
  } catch (e: any) {
    const duration = Date.now() - start
    return { name, passed: false, duration, error: e.message, soft }
  }
}

async function fetchOk(path: string, options?: RequestInit): Promise<Response> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, { ...options, redirect: 'follow' })
  if (!res.ok) {
    throw new Error(`Expected 2xx, got ${res.status} for ${path}`)
  }
  return res
}

// ── Test definitions ──

const tests: Array<{ name: string; fn: () => Promise<void>; soft?: boolean }> = [
  {
    name: '首页可访问',
    fn: async () => {
      const res = await fetchOk('/')
      const html = await res.text()
      if (!html.includes('<')) throw new Error('Response is not HTML')
    },
  },
  {
    name: '文章列表页',
    fn: async () => {
      await fetchOk('/articles')
    },
  },
  {
    name: '文章详情页',
    fn: async () => {
      // Use a known article that should always exist
      const res = await fetchOk('/articles/ai-brief/2026-04-06')
      const html = await res.text()
      if (!html.includes('AI') && !html.includes('article'))
        throw new Error('Article page missing expected content')
    },
  },
  {
    name: 'API: 文章列表',
    fn: async () => {
      const res = await fetchOk('/api/articles')
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('Expected JSON array')
      if (data.length === 0) throw new Error('No articles returned')
    },
  },
  {
    name: 'API: 搜索',
    fn: async () => {
      const res = await fetchOk('/api/search?q=typescript')
      const data = await res.json()
      if (typeof data !== 'object') throw new Error('Expected JSON object')
    },
  },
  {
    name: 'API: AI 聊天',
    fn: async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
      })
      // Accept 200 (success) or 500 with JSON error (API key missing in preview)
      if (res.status !== 200) {
        const text = await res.text()
        throw new Error(`Expected 200, got ${res.status}: ${text.slice(0, 100)}`)
      }
    },
    soft: true, // API key may not be available in preview
  },
  {
    name: 'API: 健康检查',
    fn: async () => {
      const res = await fetchOk('/api/health')
      const data = await res.json()
      if (data.status !== 'ok') throw new Error(`Health status: ${data.status}`)
    },
  },
  {
    name: '静态资源',
    fn: async () => {
      await fetchOk('/favicon.ico')
    },
  },
  {
    name: '404 处理',
    fn: async () => {
      const res = await fetch(`${BASE_URL}/nonexistent-page-xyz-123`)
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`)
    },
  },
  {
    name: 'RSS Feeds 页',
    fn: async () => {
      await fetchOk('/feeds')
    },
  },
  {
    name: '路线图页',
    fn: async () => {
      await fetchOk('/roadmap')
    },
  },
]

// ── Runner ──

async function main() {
  console.log(`\n[SMOKE] Testing ${BASE_URL} ...\n`)

  const results: TestResult[] = []

  for (const test of tests) {
    const result = await runTest(test.name, test.fn, test.soft)
    results.push(result)

    const icon = result.passed ? '\x1b[32mPASS\x1b[0m' : result.soft ? '\x1b[33mWARN\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
    const detail = result.passed ? `(${result.duration}ms)` : `- ${result.error}`
    console.log(`  [${icon}] ${result.name} ${detail}`)
  }

  const hardResults = results.filter((r) => !r.soft)
  const hardPassed = hardResults.filter((r) => r.passed).length
  const hardTotal = hardResults.length
  const softFails = results.filter((r) => r.soft && !r.passed)

  console.log(`\n[RESULT] ${hardPassed}/${hardTotal} passed`)
  if (softFails.length > 0) {
    console.log(`[WARN]   ${softFails.length} soft failure(s): ${softFails.map((r) => r.name).join(', ')}`)
  }

  const failed = hardResults.some((r) => !r.passed)
  if (failed) {
    console.log('\n\x1b[31mSmoke test FAILED\x1b[0m\n')
    process.exit(1)
  } else {
    console.log('\n\x1b[32mSmoke test PASSED\x1b[0m\n')
    process.exit(0)
  }
}

main().catch((e) => {
  console.error('Smoke test runner error:', e)
  process.exit(1)
})
