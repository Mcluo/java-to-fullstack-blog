'use client'

import { useState } from 'react'

interface ArticleNav {
  title: string
  slug: string
  category: string
  publishedAt?: string
}

interface AiBriefRendererProps {
  content: string
  title: string
  publishedAt?: string
  excerpt?: string
  navigation?: {
    previous?: ArticleNav
    next?: ArticleNav
    related?: ArticleNav[]
  }
  slug?: string
}

export default function AiBriefRenderer({ content, title, publishedAt, excerpt, navigation, slug }: AiBriefRendererProps) {
  const sections = parseAiBriefContent(content)

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="max-w-3xl mx-auto px-6 py-16 pb-32">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="text-sm text-gray-500 mb-6 tracking-wide">
            {publishedAt && formatDate(publishedAt)}
            <span className="mx-2">&middot;</span>
            <span>日报</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
            {title}
          </h1>
          {excerpt && (
            <p className="text-base text-gray-500 leading-relaxed max-w-2xl mx-auto">
              {excerpt}
            </p>
          )}
          <div className="mt-8 flex justify-center">
            <div className="w-12 h-[3px] bg-red-600 rounded-full"></div>
          </div>
        </header>

        {/* Cover Illustration */}
        <CoverImage slug={slug} title={title} />

        {/* Overview Section - Expandable */}
        {sections.overview && (
          <ExpandableOverview text={sections.overview} />
        )}

        {/* Featured Papers */}
        {sections.featured.length > 0 && (
          <section className="space-y-8">
            {sections.featured.map((paper, idx) => (
              <PaperCard key={idx} paper={paper} />
            ))}
          </section>
        )}

        {/* Also Worth Reading */}
        {sections.alsoWorth.length > 0 && (
          <section className="mt-16">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">也值得关注</h2>
            <div className="space-y-4">
              {sections.alsoWorth.map((item, idx) => (
                <AlsoWorthItem key={idx} item={item} index={idx + sections.featured.length + 1} />
              ))}
            </div>
          </section>
        )}

        {/* Continue Reading */}
        <ContinueReading navigation={navigation} />

        {/* Email Subscription */}
        <SubscribeSection />

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-300/50">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-400 mb-4">
            <a href="/articles" className="hover:text-gray-600 transition">存档</a>
            <span>&middot;</span>
            <a href="https://ai-brief.liziran.com/zh" className="hover:text-gray-600 transition" target="_blank" rel="noopener noreferrer">AI论文简报</a>
          </div>
          <p className="text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} AI论文简报
          </p>
        </footer>
      </div>

      {/* Social Share Bar */}
      <ShareBar title={title} />
    </div>
  )
}

// ============================================================
// Expandable Overview
// ============================================================
function ExpandableOverview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">今日概览</h2>
      <div
        className="cursor-pointer select-none group"
        onClick={() => setExpanded(!expanded)}
      >
        <p
          className={`text-gray-600 leading-[1.9] text-[15px] transition-all duration-300 ${
            expanded ? '' : 'line-clamp-3'
          }`}
        >
          {text}
        </p>
        {!expanded && (
          <div className="mt-2 w-12 h-[2px] bg-red-600/60 rounded-full mx-auto group-hover:bg-red-600 transition" />
        )}
      </div>
    </section>
  )
}

// ============================================================
// Paper Card
// ============================================================
interface Paper {
  number: string
  title: string
  domain: string
  content: string
  keypoints: string[]
  source: string
}

function PaperCard({ paper }: { paper: Paper }) {
  const scholarUrl = paper.source
    ? `https://scholar.google.com/scholar?q=${encodeURIComponent(paper.source)}`
    : undefined

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm">
      {/* Header: Number + Domain + Title */}
      <div className="flex items-start gap-4 mb-6">
        <span className="text-4xl font-bold text-red-600 leading-none tabular-nums shrink-0 pt-1">
          {paper.number}
        </span>
        <div>
          <span className="inline-block text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full mb-2">
            {paper.domain}
          </span>
          <h3 className="text-xl font-bold text-gray-900 leading-snug">
            {paper.title}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="text-gray-600 leading-[1.9] text-[15px] mb-6">
        {paper.content}
      </div>

      {/* Key Points */}
      {paper.keypoints.length > 0 && (
        <div className="space-y-2.5 mb-6">
          {paper.keypoints.map((point, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-gray-50 rounded-lg px-4 py-3">
              <span className="text-gray-400 mt-0.5 shrink-0">&bull;</span>
              <span className="text-sm text-gray-600 leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
      )}

      {/* Source - Now clickable */}
      {paper.source && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            原文:{' '}
            {scholarUrl ? (
              <a
                href={scholarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 italic hover:text-red-600 transition underline underline-offset-2 decoration-gray-300 hover:decoration-red-400"
              >
                {paper.source}
              </a>
            ) : (
              <span className="text-gray-500 italic">{paper.source}</span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Also Worth Item
// ============================================================
interface AlsoWorthEntry {
  title: string
  domain: string
  description: string
  link?: string
}

function AlsoWorthItem({ item, index }: { item: AlsoWorthEntry; index: number }) {
  const num = String(index).padStart(2, '0')
  const linkUrl = item.link || `https://scholar.google.com/scholar?q=${encodeURIComponent(item.title)}`

  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-200/60 last:border-0">
      <span className="text-sm font-semibold text-gray-400 tabular-nums shrink-0 pt-0.5">{num}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
            {item.domain}
          </span>
          <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          {item.description}
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 ml-1 text-gray-400 hover:text-red-600 transition text-xs"
          >
            <span className="text-xs">&#8599;</span>链接
          </a>
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Share Bar
// ============================================================
function ShareBar({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  const [showWechat, setShowWechat] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: window.location.href })
      } catch {
        // user cancelled
      }
    } else {
      handleCopy()
    }
  }

  const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(title)}`
  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`

  return (
    <>
      {/* Wechat QR overlay */}
      {showWechat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowWechat(false)}>
          <div className="bg-white rounded-2xl p-8 text-center shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-gray-900 font-medium mb-3">微信分享</p>
            <p className="text-sm text-gray-500 mb-4">请截图后在微信中分享</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 font-medium">{title}</p>
              <p className="text-xs text-gray-400 mt-1 break-all">{typeof window !== 'undefined' ? window.location.href : ''}</p>
            </div>
            <button
              onClick={() => setShowWechat(false)}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-40">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-center gap-3">
          <button
            onClick={() => setShowWechat(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-green-600 transition rounded-lg hover:bg-green-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.133 0 .241-.108.241-.246 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-2.18 2.769c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.36 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/></svg>
            微信
          </button>
          <a
            href={weiboUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-500 transition rounded-lg hover:bg-red-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zm-1.36-8.158c-3.15.447-5.527 2.484-5.298 4.567.232 2.037 3.003 3.26 6.148 2.813 3.15-.449 5.527-2.484 5.298-4.521-.229-2.082-2.996-3.309-6.148-2.859zM20.69 5.835c-1.285-1.381-3.174-1.91-5.019-1.573.454.061.53.693.096.765-1.592.298-2.496 1.153-2.908 2.166 1.575-.543 3.697-.353 5.245.976.877.748 1.504 1.92 1.504 3.209 0 .087-.002.174-.006.26.635-.14.65-.778.069-.816-.004-.003.015-.493.015-.493 0-1.742-.667-3.304-1.753-4.493l.002-.001zM17.882 3.786c-1.842-1.976-4.545-2.741-7.189-2.252.65.088.76.992.137 1.096-2.28.427-3.576 1.651-4.166 3.103 2.255-.778 5.296-.506 7.512 1.397 1.256 1.073 2.153 2.751 2.153 4.6 0 .124-.003.249-.009.372.91-.201.931-1.114.098-1.168-.005-.003.022-.706.022-.706 0-2.495-.955-4.732-2.512-6.436l-.046-.006z"/></svg>
            微博
          </a>
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition rounded-lg hover:bg-gray-100"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            X
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 transition rounded-lg hover:bg-blue-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            {copied ? '已复制' : '复制链接'}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-purple-600 transition rounded-lg hover:bg-purple-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            分享
          </button>
        </div>
      </div>
    </>
  )
}

// ============================================================
// Continue Reading
// ============================================================
function ContinueReading({ navigation }: { navigation?: AiBriefRendererProps['navigation'] }) {
  if (!navigation) return null
  const items = [navigation.previous, navigation.next, ...(navigation.related || [])].filter(Boolean) as ArticleNav[]
  if (items.length === 0) return null

  // Deduplicate by slug
  const seen = new Set<string>()
  const unique = items.filter(item => {
    if (seen.has(item.slug)) return false
    seen.add(item.slug)
    return true
  }).slice(0, 3)

  return (
    <nav className="mt-16 pt-8 border-t border-gray-300/50">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">继续阅读</h2>
      <div className="space-y-3">
        {unique.map((item) => (
          <a
            key={item.slug}
            href={`/articles/${item.category}/${item.slug}`}
            className="block bg-white rounded-xl px-6 py-4 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-4">
              {item.publishedAt && (
                <span className="text-sm text-gray-400 tabular-nums shrink-0">
                  {formatDate(item.publishedAt)}
                </span>
              )}
              <span className="text-gray-900 font-medium group-hover:text-red-600 transition truncate">
                {item.title}
              </span>
            </div>
          </a>
        ))}
      </div>
      <a
        href="/articles"
        className="inline-flex items-center gap-1 mt-4 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        查看全部存档 <span>&rarr;</span>
      </a>
    </nav>
  )
}

// ============================================================
// Subscribe Section
// ============================================================
function SubscribeSection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubmitted(true)
    }
  }

  return (
    <section className="mt-16 bg-white rounded-2xl p-8 text-center">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">订阅AI论文简报</h3>
      <p className="text-sm text-gray-500 mb-6">论文我来读，简报发给你</p>
      {submitted ? (
        <p className="text-sm text-green-600">感谢订阅！</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            订阅
          </button>
        </form>
      )}
    </section>
  )
}

// ============================================================
// Cover Image
// ============================================================
function CoverImage({ slug, title }: { slug?: string; title: string }) {
  if (!slug) return null
  const src = `/images/ai-brief/${slug}.webp`

  return (
    <div className="mb-12">
      <img
        src={src}
        alt={title}
        className="w-full rounded-2xl shadow-sm"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

interface ParsedSections {
  overview: string
  featured: Paper[]
  alsoWorth: AlsoWorthEntry[]
}

function parseAiBriefContent(content: string): ParsedSections {
  const lines = content.split('\n')
  let overview = ''
  const featured: Paper[] = []
  const alsoWorth: AlsoWorthEntry[] = []

  let section: 'none' | 'overview' | 'featured' | 'also' = 'none'
  let currentPaper: Partial<Paper> | null = null
  let currentContent: string[] = []
  let currentKeypoints: string[] = []

  const flushPaper = () => {
    if (currentPaper && currentPaper.number) {
      featured.push({
        number: currentPaper.number || '',
        title: currentPaper.title || '',
        domain: currentPaper.domain || '',
        content: currentContent.join('\n').trim(),
        keypoints: currentKeypoints.filter(k => k.trim()),
        source: currentPaper.source || '',
      })
    }
    currentPaper = null
    currentContent = []
    currentKeypoints = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip source line and horizontal rules at beginning
    if (trimmed.startsWith('> 来源:')) continue

    // Section markers
    if (trimmed === '## 今日概览') { section = 'overview'; continue }
    if (trimmed === '## 重点关注') { section = 'featured'; continue }
    if (trimmed === '## 也值得关注') { flushPaper(); section = 'also'; continue }
    if (trimmed === '---') continue

    // Overview section
    if (section === 'overview') {
      if (trimmed) overview += (overview ? ' ' : '') + trimmed
      continue
    }

    // Featured section
    if (section === 'featured') {
      // New paper: ### 01. Title
      const paperMatch = trimmed.match(/^### (\d{2})\.\s+(.+)$/)
      if (paperMatch) {
        flushPaper()
        currentPaper = { number: paperMatch[1], title: paperMatch[2] }
        continue
      }

      // Domain line: > **领域**: xxx
      const domainMatch = trimmed.match(/^>\s*\*\*领域\*\*:\s*(.+)$/)
      if (domainMatch && currentPaper) {
        currentPaper.domain = domainMatch[1]
        continue
      }

      // Source line: **原文：xxx**
      const sourceMatch = trimmed.match(/^\*\*原文[：:]\s*(.+?)\*\*$/)
      if (sourceMatch && currentPaper) {
        currentPaper.source = sourceMatch[1]
        continue
      }

      if (currentPaper && trimmed) {
        if (currentContent.length > 0 && trimmed.length < 120 && !trimmed.startsWith('**') && !trimmed.startsWith('#')) {
          const prevLine = lines[i-1]?.trim()
          if (!prevLine || currentKeypoints.length > 0) {
            currentKeypoints.push(trimmed)
            continue
          }
          const nextLine = lines[i+1]?.trim()
          if (nextLine && nextLine.length < 120 && !nextLine.startsWith('**') && !nextLine.startsWith('#') && !nextLine.startsWith('>')) {
            currentKeypoints.push(trimmed)
            continue
          }
        }
        currentContent.push(trimmed)
      }
      continue
    }

    // Also worth section
    if (section === 'also' && trimmed) {
      const domains = ['安全对齐', '推理加速', 'AI for Science', '模型架构', '机器人', '多模态', '强化学习', '数据', '训练', '评测', '代码智能', '检索', 'Agent', '生成', '效率', '架构']
      let matched = false
      for (const domain of domains) {
        if (trimmed.endsWith(domain)) {
          const title = trimmed.slice(0, -domain.length).trim()
          const descLine = lines[i + 1]?.trim() || ''
          // Remove trailing "链接" from description
          const description = descLine.replace(/[。，]?链接$/, '').trim()
          alsoWorth.push({ title, domain, description })
          i++ // skip description line
          matched = true
          break
        }
      }
    }
  }

  flushPaper()

  return { overview, featured, alsoWorth }
}
