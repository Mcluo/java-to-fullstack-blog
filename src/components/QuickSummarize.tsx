'use client'

import { useState } from 'react'
import FeedSummaryView from './FeedSummaryView'

const PLATFORMS = [
  { icon: '📺', label: 'B站', pattern: 'bilibili.com' },
  { icon: '▶️', label: 'YouTube', pattern: 'youtube.com|youtu.be' },
  { icon: '📕', label: '小红书', pattern: 'xiaohongshu.com|xhslink.com' },
  { icon: '🔗', label: '网页', pattern: '' },
]

const XHS_HINTS: { pattern: RegExp; hint: string }[] = [
  { pattern: /xsec_token/i, hint: '' },
  { pattern: /debug Chrome|未运行/, hint: '请先运行 scripts/start-chrome-debug.sh 启动调试浏览器' },
  { pattern: /超时|不存在/, hint: '链接需包含 xsec_token，请从小红书 App「复制链接」获取完整分享链接' },
  { pattern: /\[小红书\]/, hint: '' },
]

function getXhsHint(errMsg: string): string {
  if (errMsg.includes('xiaohongshu.com') || errMsg.includes('xhslink.com') || errMsg.includes('[小红书]')) {
    for (const h of XHS_HINTS) {
      if (h.pattern.test(errMsg) && h.hint) return h.hint
    }
  }
  return ''
}

export default function QuickSummarize() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<{ summary: string; subtitle?: string; title?: string; url: string } | null>(null)
  const [error, setError] = useState('')
  const [favorited, setFavorited] = useState(false)

  function detectPlatform(input: string): string {
    if (input.includes('bilibili.com') || input.match(/^BV[a-zA-Z0-9]+$/)) return 'bilibili'
    if (input.includes('youtube.com') || input.includes('youtu.be')) return 'youtube'
    if (input.includes('xiaohongshu.com') || input.includes('xhslink.com')) return 'xiaohongshu'
    return 'web'
  }

  async function handleSummarize() {
    const input = url.trim()
    if (!input) return

    setLoading(true)
    setError('')
    setResult(null)
    setFavorited(false)
    const platform = detectPlatform(input)
    const progressMsg = platform === 'xiaohongshu'
      ? '正在通过浏览器抓取小红书内容...'
      : platform === 'web' ? '正在抓取网页内容...' : '正在下载音频并转录...'
    setProgress(progressMsg)

    try {
      const res = await fetch('/api/feeds/quick-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input }),
      })
      const data = await res.json()
      if (res.ok && data.summary) {
        setResult({
          summary: data.summary,
          subtitle: data.subtitle,
          title: data.title,
          url: data.videoUrl || input,
        })
      } else {
        setError(data.error || '总结失败')
      }
    } catch {
      setError('请求失败，请重试')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="space-y-4">
      {/* URL input */}
      <div className="space-y-3">
        {/* Platform icons */}
        <div className="flex items-center justify-center gap-3">
          {PLATFORMS.map(p => (
            <span key={p.label} className="text-lg" title={p.label}>{p.icon}</span>
          ))}
        </div>

        {/* Input + button */}
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && handleSummarize()}
            placeholder="粘贴链接：B站 / YouTube / 小红书（需完整分享链接含 xsec_token）/ 任意网页"
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-gray-400"
            disabled={loading}
          />
          <button
            onClick={handleSummarize}
            disabled={loading || !url.trim()}
            className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                总结中
              </span>
            ) : '立即总结'}
          </button>
        </div>

        {/* Progress indicator */}
        {loading && progress && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            {progress}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 space-y-1">
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5">❌</span>
            <span className="break-all">{error}</span>
          </div>
          {getXhsHint(error + url) && (
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              <span className="shrink-0">💡</span>
              <span>{getXhsHint(error + url)}</span>
            </div>
          )}
          {(error.includes('超时') || error.includes('不存在') || error.includes('xsec')) && (
            <div className="flex items-start gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-1">
              <span className="shrink-0">📋</span>
              <span>小红书链接需包含 <code className="font-mono bg-blue-100 px-1 rounded">xsec_token</code> 参数。请在 App 内点击「...」→「复制链接」获取完整分享链接。</span>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Result header with favorite button */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-900 hover:text-blue-600 transition flex-1 min-w-0 truncate"
            >
              {result.title || result.url}
            </a>
            <button
              onClick={async () => {
                const res = await fetch('/api/feeds/favorites', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: result.title || result.url,
                    url: result.url,
                    summary: result.summary,
                    subtitle: result.subtitle,
                    sourceType: detectPlatform(result.url),
                    author: '',
                  }),
                })
                setFavorited(res.ok || res.status === 409)
              }}
              disabled={favorited}
              className={`ml-3 shrink-0 px-3 py-1.5 text-xs rounded-full transition flex items-center gap-1 ${
                favorited
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-amber-600 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {favorited ? '已收藏' : '收藏'}
            </button>
          </div>
          {/* Summary view */}
          <div className="p-4">
            <FeedSummaryView
              summary={result.summary}
              subtitle={result.subtitle}
              videoUrl={result.url}
            />
          </div>
        </div>
      )}
    </div>
  )
}
