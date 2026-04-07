/**
 * RSS 自动发现 + 平台模式匹配 + HTML 抓取兜底
 *
 * 三层策略:
 * 1. HTML <link> 标签自动发现 RSS/Atom URL
 * 2. 已知平台的 RSS URL 模式匹配
 * 3. HTML 抓取兜底 (解析文章列表)
 */

export interface DiscoveryResult {
  type: 'rss' | 'website'
  feedUrl: string        // RSS URL 或原始 URL
  title: string          // 站点/博客标题
  platform?: string      // 识别到的平台
  method: 'auto-discovery' | 'platform-pattern' | 'html-scrape' | 'direct-rss'
}

export interface ScrapedItem {
  title: string
  link: string
  description: string
  pubDate: string
}

// --- 已知平台 RSS 模式 ---

interface PlatformPattern {
  name: string
  match: (url: URL) => boolean
  toRss: (url: URL) => string | null
}

const PLATFORM_PATTERNS: PlatformPattern[] = [
  // Medium
  {
    name: 'Medium',
    match: (url) => url.hostname === 'medium.com' || url.hostname.endsWith('.medium.com'),
    toRss: (url) => {
      // medium.com/@user → medium.com/feed/@user
      // medium.com/publication → medium.com/feed/publication
      const path = url.pathname.replace(/\/$/, '')
      return `https://medium.com/feed${path}`
    },
  },
  // Substack
  {
    name: 'Substack',
    match: (url) => url.hostname.endsWith('.substack.com'),
    toRss: (url) => `${url.origin}/feed`,
  },
  // GitHub releases/blog
  {
    name: 'GitHub Releases',
    match: (url) => url.hostname === 'github.com' && /^\/[^/]+\/[^/]+\/?$/.test(url.pathname),
    toRss: (url) => `${url.origin}${url.pathname.replace(/\/$/, '')}/releases.atom`,
  },
  // GitHub user activity
  {
    name: 'GitHub User',
    match: (url) => url.hostname === 'github.com' && /^\/[^/]+\/?$/.test(url.pathname) && !url.pathname.includes('/'),
    toRss: (url) => {
      const user = url.pathname.replace(/^\/|\/$/g, '')
      return `https://github.com/${user}.atom`
    },
  },
  // 掘金 (Juejin)
  {
    name: '掘金',
    match: (url) => url.hostname === 'juejin.cn',
    toRss: (url) => {
      // 掘金用户页: juejin.cn/user/xxx → rsshub
      const userMatch = url.pathname.match(/\/user\/(\d+)/)
      if (userMatch) return `https://rsshub.app/juejin/posts/${userMatch[1]}`
      // 掘金分类: juejin.cn/frontend → rsshub
      const category = url.pathname.replace(/^\/|\/$/g, '')
      if (category && !category.includes('/')) return `https://rsshub.app/juejin/category/${category}`
      return null
    },
  },
  // 知乎专栏
  {
    name: '知乎专栏',
    match: (url) => url.hostname === 'zhuanlan.zhihu.com',
    toRss: (url) => {
      const column = url.pathname.replace(/^\/|\/$/g, '')
      if (column) return `https://rsshub.app/zhihu/zhuanlan/${column}`
      return null
    },
  },
  // 知乎用户
  {
    name: '知乎',
    match: (url) => url.hostname === 'www.zhihu.com' && url.pathname.startsWith('/people/'),
    toRss: (url) => {
      const user = url.pathname.match(/\/people\/([^/]+)/)?.[1]
      if (user) return `https://rsshub.app/zhihu/people/activities/${user}`
      return null
    },
  },
  // 微信公众号 (通过 WeRSS 或 RSSHub)
  {
    name: '微信公众号',
    match: (url) => url.hostname === 'mp.weixin.qq.com',
    toRss: () => null, // 需要 HTML 抓取，无通用 RSS
  },
  // 博客园
  {
    name: '博客园',
    match: (url) => url.hostname.endsWith('.cnblogs.com'),
    toRss: (url) => {
      const sub = url.hostname.replace('.cnblogs.com', '')
      if (sub && sub !== 'www') return `https://www.cnblogs.com/${sub}/rss`
      return `https://www.cnblogs.com/rss`
    },
  },
  // CSDN
  {
    name: 'CSDN',
    match: (url) => url.hostname === 'blog.csdn.net',
    toRss: (url) => {
      const user = url.pathname.match(/^\/([^/]+)/)?.[1]
      if (user) return `https://rsshub.app/csdn/blog/${user}`
      return null
    },
  },
  // 简书
  {
    name: '简书',
    match: (url) => url.hostname === 'www.jianshu.com',
    toRss: (url) => {
      const userMatch = url.pathname.match(/\/u\/([^/]+)/)
      if (userMatch) return `https://rsshub.app/jianshu/user/${userMatch[1]}`
      return null
    },
  },
  // DEV.to
  {
    name: 'DEV.to',
    match: (url) => url.hostname === 'dev.to',
    toRss: (url) => {
      const path = url.pathname.replace(/\/$/, '')
      return `https://dev.to/feed${path}`
    },
  },
  // Hashnode
  {
    name: 'Hashnode',
    match: (url) => url.hostname.endsWith('.hashnode.dev'),
    toRss: (url) => `${url.origin}/rss.xml`,
  },
  // WordPress (通用尝试)
  {
    name: 'WordPress',
    match: () => false, // 不自动匹配，作为 fallback 尝试
    toRss: (url) => `${url.origin}/feed`,
  },
  // RSS Hub 通用 (inoreader、feedly 等聚合器)
  {
    name: 'RSSHub',
    match: (url) => url.hostname === 'rsshub.app',
    toRss: (url) => url.href,
  },
  // 阮一峰博客
  {
    name: '阮一峰的网络日志',
    match: (url) => url.hostname === 'www.ruanyifeng.com',
    toRss: () => 'https://www.ruanyifeng.com/blog/atom.xml',
  },
  // InfoQ
  {
    name: 'InfoQ',
    match: (url) => url.hostname === 'www.infoq.cn',
    toRss: () => 'https://rsshub.app/infoq/recommend',
  },
  // Hacker News
  {
    name: 'Hacker News',
    match: (url) => url.hostname === 'news.ycombinator.com',
    toRss: () => 'https://hnrss.org/frontpage',
  },
  // Reddit
  {
    name: 'Reddit',
    match: (url) => url.hostname === 'www.reddit.com' || url.hostname === 'reddit.com',
    toRss: (url) => {
      const path = url.pathname.replace(/\/$/, '')
      return `https://www.reddit.com${path}.rss`
    },
  },
  // YouTube
  {
    name: 'YouTube',
    match: (url) => url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com',
    toRss: (url) => {
      const channelMatch = url.pathname.match(/\/channel\/([^/]+)/)
      if (channelMatch) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelMatch[1]}`
      const userMatch = url.pathname.match(/\/@([^/]+)/)
      if (userMatch) return `https://rsshub.app/youtube/user/@${userMatch[1]}`
      return null
    },
  },
  // 少数派
  {
    name: '少数派',
    match: (url) => url.hostname === 'sspai.com',
    toRss: () => 'https://sspai.com/feed',
  },
  // 36kr
  {
    name: '36氪',
    match: (url) => url.hostname === '36kr.com' || url.hostname === 'www.36kr.com',
    toRss: () => 'https://rsshub.app/36kr/newsflashes',
  },
  // V2EX
  {
    name: 'V2EX',
    match: (url) => url.hostname === 'www.v2ex.com' || url.hostname === 'v2ex.com',
    toRss: (url) => {
      const tab = url.pathname.match(/\?tab=(\w+)/)?.[1] || ''
      return tab ? `https://www.v2ex.com/feed/${tab}.xml` : 'https://www.v2ex.com/index.xml'
    },
  },
]

// --- 1. HTML <link> 自动发现 ---

async function autoDiscoverRSS(url: string): Promise<{ feedUrl: string; title: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JavaFullstackBlog/1.0 RSS Discoverer' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    })
    if (!res.ok) return null

    const html = await res.text()

    // 提取 title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ''

    // 查找 RSS/Atom link 标签
    const linkRegex = /<link[^>]+type=["'](application\/(rss|atom)\+xml)["'][^>]*>/gi
    const links: { href: string; title: string }[] = []

    let match
    while ((match = linkRegex.exec(html)) !== null) {
      const tag = match[0]
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i)
      const titleMatch = tag.match(/title=["']([^"']+)["']/i)
      if (hrefMatch) {
        let href = hrefMatch[1]
        // 处理相对 URL
        if (href.startsWith('/')) {
          const parsed = new URL(url)
          href = `${parsed.origin}${href}`
        } else if (!href.startsWith('http')) {
          href = new URL(href, url).href
        }
        links.push({ href, title: titleMatch?.[1] || '' })
      }
    }

    if (links.length > 0) {
      return { feedUrl: links[0].href, title: links[0].title || title }
    }

    // 也检查 <a> 标签中常见的 RSS 链接
    const commonPaths = ['/feed', '/rss', '/atom.xml', '/rss.xml', '/feed.xml', '/index.xml']
    const parsed = new URL(url)

    for (const p of commonPaths) {
      const candidateUrl = `${parsed.origin}${p}`
      if (html.includes(p)) {
        // 验证候选 URL 是否真的是 RSS
        try {
          const feedRes = await fetch(candidateUrl, {
            headers: { 'User-Agent': 'JavaFullstackBlog/1.0 RSS Discoverer' },
            signal: AbortSignal.timeout(5000),
          })
          if (feedRes.ok) {
            const contentType = feedRes.headers.get('content-type') || ''
            const body = await feedRes.text()
            if (contentType.includes('xml') || body.trimStart().startsWith('<?xml') || body.includes('<rss') || body.includes('<feed')) {
              return { feedUrl: candidateUrl, title }
            }
          }
        } catch { /* skip */ }
      }
    }

    return null
  } catch {
    return null
  }
}

// --- 2. 平台模式匹配 ---

function matchPlatformPattern(inputUrl: string): { feedUrl: string; platform: string } | null {
  let parsed: URL
  try {
    parsed = new URL(inputUrl)
  } catch {
    return null
  }

  for (const pattern of PLATFORM_PATTERNS) {
    if (pattern.match(parsed)) {
      const feedUrl = pattern.toRss(parsed)
      if (feedUrl) {
        return { feedUrl, platform: pattern.name }
      }
    }
  }

  return null
}

// --- 3. HTML 抓取 (兜底) ---

export async function scrapeArticlesFromHtml(url: string): Promise<{ items: ScrapedItem[]; title: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  })

  if (!res.ok) return { items: [], title: '' }

  const html = await res.text()

  // 提取页面标题
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const pageTitle = titleMatch ? titleMatch[1].trim() : ''

  const items: ScrapedItem[] = []

  // 策略: 提取所有 <a> 标签中看起来像文章的链接
  // 匹配常见文章 URL 模式
  const articlePatterns = [
    // 文章路径模式
    /\/(?:post|article|blog|p|archives|entry|writing|note)s?\/[^"'\s]+/gi,
    // 日期路径模式
    /\/\d{4}\/\d{2}\/[^"'\s]+/gi,
    // 掘金等平台
    /\/post\/\d+/gi,
  ]

  // 提取所有有文本内容的 <a> 标签
  const anchorRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const seen = new Set<string>()

  let anchorMatch
  while ((anchorMatch = anchorRegex.exec(html)) !== null) {
    let href = anchorMatch[1]
    const innerHtml = anchorMatch[2]

    // 清除 HTML 标签获取纯文本
    const text = innerHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

    // 过滤: 文本太短不像标题、或太长是段落
    if (text.length < 5 || text.length > 200) continue

    // 过滤导航、footer 等通用链接
    const skipWords = ['登录', '注册', '首页', '关于', 'login', 'signup', 'about', 'contact', 'home', 'menu', 'nav']
    if (skipWords.some(w => text.toLowerCase().includes(w) && text.length < 20)) continue

    // 处理相对 URL
    if (href.startsWith('/')) {
      const parsed = new URL(url)
      href = `${parsed.origin}${href}`
    } else if (!href.startsWith('http')) {
      try {
        href = new URL(href, url).href
      } catch { continue }
    }

    // 去重
    if (seen.has(href)) continue
    seen.add(href)

    // 看起来像文章的链接
    const isArticleLike = articlePatterns.some(p => {
      p.lastIndex = 0
      return p.test(href)
    }) || text.length > 15 // 标题足够长的链接通常是文章

    if (isArticleLike) {
      items.push({
        title: text,
        link: href,
        description: '',
        pubDate: '',
      })
    }
  }

  // 尝试从 <time> 或 date class 提取日期关联
  // (简单实现，不做复杂 DOM 关联)

  return { items: items.slice(0, 20), title: pageTitle }
}

// --- 主入口 ---

export async function discoverFeed(inputUrl: string): Promise<DiscoveryResult> {
  let url = inputUrl.trim()
  if (!url.startsWith('http')) url = `https://${url}`

  // 先检查是否直接就是 RSS URL
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JavaFullstackBlog/1.0 RSS Discoverer' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
        const body = await res.text()
        if (body.includes('<rss') || body.includes('<feed') || body.includes('<channel')) {
          // 从 XML 中提取标题
          const titleMatch = body.match(/<title[^>]*>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/i)
          return {
            type: 'rss',
            feedUrl: url,
            title: titleMatch?.[1]?.trim() || '',
            method: 'direct-rss',
          }
        }
      }
    }
  } catch { /* continue */ }

  // 1. 平台模式匹配 (快，优先)
  const platformResult = matchPlatformPattern(url)
  if (platformResult) {
    // 验证 RSS URL 是否可用
    try {
      const res = await fetch(platformResult.feedUrl, {
        headers: { 'User-Agent': 'JavaFullstackBlog/1.0 RSS Discoverer' },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const body = await res.text()
        if (body.includes('<rss') || body.includes('<feed') || body.includes('<channel') || body.includes('<?xml')) {
          const titleMatch = body.match(/<title[^>]*>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/i)
          return {
            type: 'rss',
            feedUrl: platformResult.feedUrl,
            title: titleMatch?.[1]?.trim() || '',
            platform: platformResult.platform,
            method: 'platform-pattern',
          }
        }
      }
    } catch { /* continue to auto-discovery */ }
  }

  // 2. HTML <link> 自动发现
  const discovered = await autoDiscoverRSS(url)
  if (discovered) {
    return {
      type: 'rss',
      feedUrl: discovered.feedUrl,
      title: discovered.title,
      platform: platformResult?.platform,
      method: 'auto-discovery',
    }
  }

  // 3. WordPress 通用 fallback (/feed, /rss, etc.)
  const parsed = new URL(url)
  const wpPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml']
  for (const p of wpPaths) {
    try {
      const candidate = `${parsed.origin}${p}`
      const res = await fetch(candidate, {
        headers: { 'User-Agent': 'JavaFullstackBlog/1.0 RSS Discoverer' },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const body = await res.text()
        if (body.includes('<rss') || body.includes('<feed') || body.includes('<channel')) {
          const titleMatch = body.match(/<title[^>]*>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/i)
          return {
            type: 'rss',
            feedUrl: candidate,
            title: titleMatch?.[1]?.trim() || '',
            method: 'auto-discovery',
          }
        }
      }
    } catch { /* try next */ }
  }

  // 4. HTML 抓取兜底
  const scraped = await scrapeArticlesFromHtml(url)
  return {
    type: 'website',
    feedUrl: url,
    title: scraped.title || '',
    platform: platformResult?.platform,
    method: 'html-scrape',
  }
}
