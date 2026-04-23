'use client'

import { useState, useEffect } from 'react'

interface FeedSource {
  id: string
  name: string
  url: string
  feedUrl?: string
  type: 'rss' | 'website'
  platform?: string
  category: string
  enabled: boolean
  maxItems: number
}

interface FeedConfig {
  version: number
  feeds: FeedSource[]
}

interface DiscoveryResult {
  type: 'rss' | 'website'
  feedUrl: string
  title: string
  platform?: string
  method: string
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-blue-500' : 'bg-gray-200'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-5' : ''
      }`} />
    </button>
  )
}

const METHOD_LABELS: Record<string, string> = {
  'direct-rss': 'RSS 直链',
  'platform-pattern': '平台匹配',
  'auto-discovery': '自动发现',
  'html-scrape': 'HTML 抓取',
}

export default function FeedConfigManager() {
  const [config, setConfig] = useState<FeedConfig>({ version: 1, feeds: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', url: '', category: '', maxItems: 10, sourceType: 'rss' as 'rss' | 'bilibili' | 'youtube' })
  const [error, setError] = useState('')

  // 智能发现相关状态
  const [discovering, setDiscovering] = useState(false)
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch('/api/feeds/config')
      const data = await res.json()
      setConfig(data)
    } catch {
      setError('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  // 智能 URL 发现
  async function handleDiscover() {
    const url = form.url.trim()
    if (!url) {
      setError('请先输入 URL')
      return
    }

    setDiscovering(true)
    setDiscovery(null)
    setError('')

    try {
      const res = await fetch('/api/feeds/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const result: DiscoveryResult = await res.json()

      if (res.ok) {
        setDiscovery(result)
        // 自动填充名称（如果为空）
        if (!form.name && result.title) {
          setForm(f => ({ ...f, name: result.title }))
        }
      } else {
        setError((result as any).error || '发现失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setDiscovering(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.url) {
      setError('名称和 URL 为必填')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload: any = { ...form }

      // 附加发现结果
      payload.sourceType = form.sourceType

      if (form.sourceType === 'bilibili' || form.sourceType === 'youtube') {
        payload.type = 'website'
        payload.platform = form.sourceType === 'bilibili' ? 'Bilibili' : 'YouTube'
        // Extract channel ID
        if (form.sourceType === 'bilibili') {
          const m = form.url.match(/space\.bilibili\.com\/(\d+)/)
          if (m) payload.channelId = m[1]
          else if (/^\d+$/.test(form.url.trim())) payload.channelId = form.url.trim()
        }
      } else if (discovery) {
        payload.type = discovery.type
        payload.feedUrl = discovery.type === 'rss' ? discovery.feedUrl : undefined
        payload.platform = discovery.platform
      } else {
        payload.type = 'rss'
      }

      if (editingId) {
        const res = await fetch('/api/feeds/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
        if (!res.ok) throw new Error('更新失败')
      } else {
        const res = await fetch('/api/feeds/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('添加失败')
      }

      await fetchConfig()
      resetForm()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除该订阅源？')) return

    try {
      await fetch(`/api/feeds/config?id=${id}`, { method: 'DELETE' })
      await fetchConfig()
    } catch {
      setError('删除失败')
    }
  }

  async function handleToggle(feed: FeedSource) {
    try {
      await fetch('/api/feeds/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feed.id, enabled: !feed.enabled }),
      })
      await fetchConfig()
    } catch {
      setError('更新失败')
    }
  }

  function handleEdit(feed: FeedSource) {
    setEditingId(feed.id)
    setForm({ name: feed.name, url: feed.url, category: feed.category, maxItems: feed.maxItems, sourceType: (feed as any).sourceType || 'rss' })
    setDiscovery(null)
    setShowForm(true)
  }

  function resetForm() {
    setForm({ name: '', url: '', category: '', maxItems: 10, sourceType: 'rss' })
    setEditingId(null)
    setShowForm(false)
    setDiscovery(null)
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">加载中...</div>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
        >
          + 添加订阅源
        </button>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId ? '编辑订阅源' : '添加订阅源'}
          </h3>

          {/* Source type selector */}
          <div className="flex gap-2">
            {([
              { value: 'rss', label: 'RSS / 网站', icon: '📡' },
              { value: 'bilibili', label: 'B站 UP主', icon: '📺' },
              { value: 'youtube', label: 'YouTube', icon: '▶️' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, sourceType: opt.value }))}
                className={`flex-1 px-3 py-2.5 text-sm rounded-lg border transition ${
                  form.sourceType === opt.value
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="mr-1.5">{opt.icon}</span>{opt.label}
              </button>
            ))}
          </div>

          {/* Smart URL input */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={
                  form.sourceType === 'bilibili' ? '输入 B站空间链接或 UID (如 489667127)'
                  : form.sourceType === 'youtube' ? '输入 YouTube 频道链接 (如 https://youtube.com/@channel)'
                  : '输入任意 URL — 博客地址、公众号、GitHub、掘金、知乎...'
                }
                value={form.url}
                onChange={e => { setForm(f => ({ ...f, url: e.target.value })); setDiscovery(null) }}
                className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {form.sourceType === 'rss' && (
                <button
                  type="button"
                  onClick={handleDiscover}
                  disabled={discovering || !form.url.trim()}
                  className="px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                >
                  {discovering ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      检测中
                    </span>
                  ) : '智能检测'}
                </button>
              )}
            </div>

            {/* Discovery result */}
            {discovery && (
              <div className={`rounded-lg px-4 py-3 text-sm border ${
                discovery.type === 'rss'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  {discovery.type === 'rss' ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {discovery.type === 'rss' ? '已发现 RSS 订阅源' : '未找到 RSS，将使用 HTML 抓取模式'}
                </div>
                <div className="mt-1.5 text-xs space-y-0.5">
                  {discovery.platform && <div>平台: {discovery.platform}</div>}
                  <div>方式: {METHOD_LABELS[discovery.method] || discovery.method}</div>
                  {discovery.type === 'rss' && discovery.feedUrl !== form.url && (
                    <div className="truncate">RSS: {discovery.feedUrl}</div>
                  )}
                  {discovery.title && <div>标题: {discovery.title}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Other fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="名称 (如: Hacker News)"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              type="text"
              placeholder="分类 (如: 前端, AI)"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <input
              type="number"
              placeholder="最大条数"
              value={form.maxItems}
              onChange={e => setForm(f => ({ ...f, maxItems: parseInt(e.target.value) || 10 }))}
              min={1}
              max={50}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {!editingId && !discovery && (
            <p className="text-xs text-gray-400">
              支持: RSS/Atom 直链、Medium、Substack、GitHub、掘金、知乎、博客园、CSDN、简书、DEV.to、Hashnode、Reddit、YouTube、少数派、36氪、V2EX、阮一峰博客、WordPress 等。其他网站自动尝试发现 RSS 或使用 HTML 抓取。
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saving ? '保存中...' : editingId ? '更新' : '添加'}
            </button>
          </div>
        </form>
      )}

      {/* Feed list */}
      {config.feeds.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-3">📡</div>
          <p className="text-sm">还没有订阅源</p>
          <p className="text-xs mt-1">点击上方按钮添加订阅源，支持任意博客/网站 URL</p>
        </div>
      ) : (
        <div className="space-y-2">
          {config.feeds.map(feed => (
            <div
              key={feed.id}
              className={`bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 transition ${
                !feed.enabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{feed.name}</span>
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">{feed.category}</span>
                  {(feed as any).sourceType === 'bilibili' ? (
                    <span className="px-1.5 py-0.5 text-[10px] bg-pink-100 text-pink-700 rounded">B站</span>
                  ) : (feed as any).sourceType === 'youtube' ? (
                    <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded">YouTube</span>
                  ) : feed.type === 'website' ? (
                    <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded">HTML</span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">RSS</span>
                  )}
                  {feed.platform && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">{feed.platform}</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{feed.url}</div>
                {feed.feedUrl && feed.feedUrl !== feed.url && (
                  <div className="text-xs text-green-500 mt-0.5 truncate">RSS: {feed.feedUrl}</div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Toggle checked={feed.enabled} onChange={() => handleToggle(feed)} />
                <button
                  onClick={() => handleEdit(feed)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
                  title="编辑"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(feed.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
